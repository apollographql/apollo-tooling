import * as t from '@babel/types';
import { stripIndent } from 'common-tags';
import {
  GraphQLEnumType,
  GraphQLInputObjectType,
} from 'graphql';
import * as path from 'path';

import {
  CompilerContext,
  Operation,
  Fragment,
  SelectionSet,
  Field,
} from '../../compiler';

import {
  typeCaseForSelectionSet,
  Variant
} from '../../compiler/visitors/typeCase';

import {
  collectAndMergeFields
} from '../../compiler/visitors/collectAndMergeFields';

import { BasicGeneratedFile } from '../../utilities/CodeGenerator';
import TypescriptGenerator, { ObjectProperty, TypescriptCompilerOptions, } from './language';
import Printer from './printer';
import { GraphQLType, isType } from 'graphql/type/definition';
import { FragmentSpread } from '../../compiler';
import { GraphQLNonNull } from 'graphql';
import { GraphQLOutputType } from 'graphql';
import { getNullableType } from 'graphql';
import { GraphQLList } from 'graphql';
import { maybePush } from '../../utilities/array';
import { GraphQLObjectType } from 'graphql';

class TypescriptGeneratedFile implements BasicGeneratedFile {
  fileContents: string;

  constructor(fileContents: string) {
    this.fileContents = fileContents;
  }
  get output() {
    return this.fileContents
  }
}

function printEnumsAndInputObjects(generator: TypescriptAPIGenerator, typesUsed: GraphQLType[]) {
  generator.printer.enqueue(stripIndent`
    //==============================================================
    // START Enums and Input Objects
    // All enums and input objects are included in every output file
    // for now, but this will be changed soon.
    // TODO: Link to issue to fix this.
    //==============================================================
  `);

  typesUsed
    .filter(type => (type instanceof GraphQLEnumType))
    .forEach((enumType) => {
      generator.typeAliasForEnumType(enumType as GraphQLEnumType);
    });

  typesUsed
    .filter(type => type instanceof GraphQLInputObjectType)
    .forEach((inputObjectType) => {
      generator.typeAliasForInputObjectType(inputObjectType as GraphQLInputObjectType);
    });

  generator.printer.enqueue(stripIndent`
    //==============================================================
    // END Enums and Input Objects
    //==============================================================
  `)
}

export function generateSource(
  context: CompilerContext,
) {
  const generator = new TypescriptAPIGenerator(context);
  const generatedFiles: { [filePath: string]: TypescriptGeneratedFile } = {};

  Object.values(context.operations)
    .forEach((operation) => {
      generator.fileHeader();
      generator.interfacesForOperation(operation);

      const typesUsed = generator.getTypesUsedForOperation(operation, context);
      printEnumsAndInputObjects(generator, typesUsed);

      const output = generator.printer.printAndClear();

      const outputFilePath = path.join(
        path.dirname(operation.filePath),
        '__generated__',
        `${operation.operationName}.ts`
      );

      generatedFiles[outputFilePath] = new TypescriptGeneratedFile(output);
    });

  Object.values(context.fragments)
    .forEach((fragment) => {
      generator.fileHeader();
      generator.interfacesForFragment(fragment);

      const typesUsed = generator.getTypesUsedForFragment(fragment, context);
      printEnumsAndInputObjects(generator, typesUsed);

      const output = generator.printer.printAndClear();

      const outputFilePath = path.join(
        path.dirname(fragment.filePath),
        '__generated__',
        `${fragment.fragmentName}.ts`
      );

      generatedFiles[outputFilePath] = new TypescriptGeneratedFile(output);
    });

  return generatedFiles;
}

export class TypescriptAPIGenerator extends TypescriptGenerator {
  context: CompilerContext
  printer: Printer
  scopeStack: string[]

  constructor(context: CompilerContext) {
    super(context.options as TypescriptCompilerOptions);

    this.context = context;
    this.printer = new Printer();
    this.scopeStack = [];
  }

  fileHeader() {
    this.printer.enqueue(
      stripIndent`
        /* tslint:disable */
        // This file was automatically generated and should not be edited.
      `
    );
  }

  public typeAliasForEnumType(enumType: GraphQLEnumType) {
    this.printer.enqueue(this.enumerationDeclaration(enumType));
  }

  public typeAliasForInputObjectType(inputObjectType: GraphQLInputObjectType) {
    this.printer.enqueue(this.inputObjectDeclaration(inputObjectType));
  }

  public interfacesForOperation(operation: Operation) {
    const {
      operationType,
      operationName,
      variables,
      selectionSet
    } = operation;

    this.scopeStackPush(operationName);

    this.printer.enqueue(stripIndent`
      // ====================================================
      // GraphQL ${operationType} operation: ${operationName}
      // ====================================================
    `)

    // The root operation only has one variant
    // Do we need to get exhaustive variants anyway?
    const variants = this.getVariantsForSelectionSet(selectionSet);

    const variant = variants[0];
    const properties = this.getPropertiesForVariant(variant);

    const exportedTypeAlias = this.exportDeclaration(
      this.interface(operationName, properties)
    );

    this.printer.enqueue(exportedTypeAlias);
    this.scopeStackPop();

    // Generate the variables interface if the operation has any variables
    if (variables.length > 0) {
      const interfaceName = operationName + 'Variables';
      this.scopeStackPush(interfaceName);
      this.printer.enqueue(this.exportDeclaration(
        this.interface(interfaceName, variables.map((variable) => ({
          name: variable.name,
          type: this.typeFromGraphQLType(variable.type)
        })), { keyInheritsNullability: true })
      ));
      this.scopeStackPop();
    }
  }

  public interfacesForFragment(fragment: Fragment) {
    const {
      fragmentName,
      selectionSet
    } = fragment;
    this.scopeStackPush(fragmentName);

    this.printer.enqueue(stripIndent`
      // ====================================================
      // GraphQL fragment: ${fragmentName}
      // ====================================================
    `);

    const variants = this.getVariantsForSelectionSet(selectionSet);

    if (variants.length === 1) {
      const properties = this.getPropertiesForVariant(variants[0]);

      const name = this.nameFromScopeStack(this.scopeStack);
      const exportedTypeAlias = this.exportDeclaration(
        this.interface(
          name,
          properties
        )
      );

      this.printer.enqueue(exportedTypeAlias);
    } else {
      const unionMembers: t.Identifier[] = [];
      variants.forEach(variant => {
        this.scopeStackPush(variant.possibleTypes[0].toString());
        const properties = this.getPropertiesForVariant(variant);

        const name = this.nameFromScopeStack(this.scopeStack);
        const exportedTypeAlias = this.exportDeclaration(
          this.interface(
            name,
            properties
          )
        );

        this.printer.enqueue(exportedTypeAlias);

        unionMembers.push(t.identifier(this.nameFromScopeStack(this.scopeStack)));

        this.scopeStackPop();
      });

      this.printer.enqueue(
        this.exportDeclaration(
          this.typeAliasGenericUnion(
            this.nameFromScopeStack(this.scopeStack),
            unionMembers.map((id) => t.TSTypeReference(id))
          )
        )
      );
    }

    this.scopeStackPop();
  }

  public getTypesUsedForOperation(operation: Operation, context: CompilerContext) {
    const operationTypesUsed = operation.variables
      .map(({ type }) => type)
      .reduce(this.reduceTypesUsed, [])
      .filter((type) => isType(type))
    ;

    return context.typesUsed
      .filter((type) => {
        return operationTypesUsed.find((typeUsed) => type === typeUsed);
      });
  }

  public getTypesUsedForFragment(fragment: Fragment, context: CompilerContext) {
    const reduceTypesForFragment = (
      fragmentSpread: Fragment | FragmentSpread,
      acc: GraphQLType[]
    ) => {
      const {
        selectionSet: {
          possibleTypes,
          selections,
        },
      } = fragmentSpread;

      acc = possibleTypes.reduce(maybePush, acc);

      acc = selections
        .reduce((selectionAcc, selection) => {
          switch (selection.kind) {
            case 'Field':
            case 'TypeCondition':
              selectionAcc = maybePush(selectionAcc, selection.type);
              break;
            case 'FragmentSpread':
              selectionAcc = reduceTypesForFragment(selection, selectionAcc);
              break;
            default:
              break;
          }

          return selectionAcc;
        }, acc);

      return acc;
    }

    const fragmentTypesUsed = reduceTypesForFragment(fragment, [])
      .reduce(this.reduceTypesUsed, []);

    return context.typesUsed
      .filter((type) => {
        return fragmentTypesUsed.find((typeUsed) => type === typeUsed);
      });
  }

  private reduceTypesUsed = (
    acc: (GraphQLType | GraphQLOutputType)[],
    type: GraphQLType
  ) =>{
    if (type instanceof GraphQLNonNull) {
      type = getNullableType(type);
    }

    if (type instanceof GraphQLList) {
      type = type.ofType
    }

    if (
      type instanceof GraphQLInputObjectType
      || type instanceof GraphQLObjectType
    ) {
      acc = maybePush(acc, type);
      const fields = type.getFields();
      acc = Object.keys(fields)
        .map((key) => fields[key] && fields[key].type)
        .reduce(this.reduceTypesUsed, acc);
      ;
    } else {
      acc = maybePush(acc, type);
    }

    return acc;
  }

  private getVariantsForSelectionSet(selectionSet: SelectionSet) {
    return this.getTypeCasesForSelectionSet(selectionSet).exhaustiveVariants;
  }

  private getTypeCasesForSelectionSet(selectionSet: SelectionSet) {
    return typeCaseForSelectionSet(
      selectionSet,
      this.context.options.mergeInFieldsFromFragmentSpreads
    );
  }

  private getPropertiesForVariant(variant: Variant): ObjectProperty[] {
    const fields = collectAndMergeFields(
      variant,
      this.context.options.mergeInFieldsFromFragmentSpreads
    );
    return fields.map(field => {
      const fieldName = field.alias !== undefined ? field.alias : field.name;
      this.scopeStackPush(fieldName);

      let res: ObjectProperty;
      if (field.selectionSet) {
        res = this.handleFieldSelectionSetValue(
          t.identifier(this.nameFromScopeStack(this.scopeStack)),
          field
        );
      } else {
        res = this.handleFieldValue(
          field,
          variant
        );
      }

      this.scopeStackPop();
      return res;
    });
  }

  private handleFieldSelectionSetValue(generatedIdentifier: t.Identifier, field: Field): ObjectProperty {
    const { selectionSet } = field;

    const type = this.typeFromGraphQLType(field.type, generatedIdentifier.name);

    const typeCase = this.getTypeCasesForSelectionSet(selectionSet as SelectionSet);
    const variants = typeCase.exhaustiveVariants;

    let exportedTypeAlias;
    if (variants.length === 1) {
      const variant = variants[0];
      const properties = this.getPropertiesForVariant(variant);
      exportedTypeAlias = this.exportDeclaration(
        this.interface(
          this.nameFromScopeStack(this.scopeStack),
          properties
        )
      );
    } else {
      const identifiers = variants.map(variant => {
        this.scopeStackPush(variant.possibleTypes[0].toString())
        const properties = this.getPropertiesForVariant(variant);
        const identifierName = this.nameFromScopeStack(this.scopeStack);

        this.printer.enqueue(this.exportDeclaration(
          this.interface(
            identifierName,
            properties
          )
        ));

        this.scopeStackPop();
        return t.identifier(identifierName);
      });

      exportedTypeAlias = this.exportDeclaration(
        this.typeAliasGenericUnion(
          generatedIdentifier.name,
          identifiers.map(i => t.TSTypeReference(i))
        )
      );
    }

    this.printer.enqueue(exportedTypeAlias);

    return {
      name: field.alias ? field.alias : field.name,
      description: field.description,
      type
    };
  }

  private handleFieldValue(field: Field, variant: Variant): ObjectProperty {
    let res: ObjectProperty;
    if (field.name === '__typename') {
      const types = variant.possibleTypes
        .map(type => {
          return t.TSLiteralType(t.stringLiteral(type.toString()));
        });

      res = {
        name: field.alias ? field.alias : field.name,
        description: field.description,
        type: t.TSUnionType(types)
      };
    } else {
      // TODO: Double check that this works
      res = {
        name: field.alias ? field.alias : field.name,
        description: field.description,
        type: this.typeFromGraphQLType(field.type)
      };
    }

    return res;
  }

  public get output(): string {
    return this.printer.print();
  }

  scopeStackPush(name: string) {
    this.scopeStack.push(name);
  }

  scopeStackPop() {
    const popped = this.scopeStack.pop()
    return popped;
  }

}
