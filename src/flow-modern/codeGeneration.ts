import { parse } from 'babylon';
import generate from 'babel-generator';
import * as t from 'babel-types';
import { stripIndent } from 'common-tags';
import {
  getNamedType,
  GraphQLEnumType,
  GraphQLField,
  GraphQLInputObjectType,
  GraphQLInputField,
  GraphQLList,
  GraphQLObjectType,
  GraphQLNonNull,
  isCompositeType,
  GraphQLError,
  GraphQLType
} from 'graphql';

import {
  CompilerContext,
  Operation,
  Fragment,
  SelectionSet,
  Field,
} from '../compiler';

import {
  typeCaseForSelectionSet,
  Variant
} from '../compiler/visitors/typeCase';

// import {
//   collectFragmentsReferenced
// } from '../compiler/visitors/collectFragmentsReferenced';

import {
  collectAndMergeFields
} from '../compiler/visitors/collectAndMergeFields';

import { typeAnnotationFromGraphQLType } from './helpers';
import FlowGenerator, {
  ObjectProperty,
} from './language';
import Printer from './printer';

export function generateSource(
  context: CompilerContext,
  outputIndividualFiles?: boolean = false,
  only?: string,
) {
  const generator = new FlowAPIGenerator(context);

  if (outputIndividualFiles) {
    // TODO
  } else{
    generator.fileHeader();

    context.typesUsed
      .filter(type => type instanceof GraphQLEnumType)
      .forEach((enumType: GraphQLEnumType) => {
        generator.typeAliasForEnumType(enumType);
      });

    context.typesUsed
      .filter(type => type instanceof GraphQLInputObjectType)
      .forEach((enumType: GraphQLInputObjectType) => {
        generator.typeAliasForInputObjectType(enumType);
      });

    Object.values(context.operations).forEach(operation => {
      // generator.typeVariablesDeclarationForOperation(operation);
      generator.typeAliasesForOperation(operation);
    });

    Object.values(context.fragments).forEach(fragment => {
      // console.log('Fragment', fragment);
      generator.typeAliasesForFragment(fragment);
    });
  }

  return generator.output;
}

export class FlowAPIGenerator extends FlowGenerator {
  context: CompilerContext
  printer: Printer
  scopeStack: string[]

  constructor(context: CompilerContext) {
    super();

    this.context = context;
    this.printer = new Printer();
    this.scopeStack = [];
  }

  fileHeader() {
    this.printer.enqueue(
      stripIndent`
        /* @flow */
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

  public typeAliasesForOperation(operation: Operation) {
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
      this.typeAliasObject(operationName, properties)
    );

    this.printer.enqueue(exportedTypeAlias);
    this.scopeStackPop();
  }

  public typeAliasesForFragment(fragment: Fragment) {
    const {
      fragmentName,
      type,
      selectionSet
    } = fragment;

    this.scopeStackPush(fragmentName);

    this.printer.enqueue(stripIndent`
      // ====================================================
      // GraphQL fragment: ${fragmentName}
      // ====================================================
    `);

    const variants = this.getVariantsForSelectionSet(selectionSet);

    const variant = variants[0];
    const properties = this.getPropertiesForVariant(variant);

    const exportedTypeAlias = this.exportDeclaration(
      this.typeAliasObject(fragmentName, properties)
    );

    this.printer.enqueue(exportedTypeAlias);
    this.scopeStackPop();
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
      this.scopeStackPush(field.name);

      let res;
      if (field.selectionSet) {
        const genericAnnotation = this.annotationFromScopeStack(this.scopeStack);
        res = this.handleFieldSelectionSetValue(
          genericAnnotation,
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

  private handleFieldSelectionSetValue(genericAnnotation: t.GenericTypeAnnotation, field: Field) {
    const { selectionSet } = field;

    const typeCase = this.getTypeCasesForSelectionSet(selectionSet as SelectionSet);
    const variants = typeCase.exhaustiveVariants;

    let exportedTypeAlias;
    if (variants.length === 1) {
      const variant = variants[0];
      const properties = this.getPropertiesForVariant(variant);
      exportedTypeAlias = this.exportDeclaration(
        this.typeAliasObject(genericAnnotation.id.name, properties)
      );
    } else {
      const propertySets = variants.map(variant => {
        return this.getPropertiesForVariant(variant);
      })

      exportedTypeAlias = this.exportDeclaration(
        this.typeAliasObjectUnion(
          genericAnnotation.id.name,
          propertySets
        )
      );
    }

    this.printer.enqueue(exportedTypeAlias);

    return {
      name: field.name,
      annotation: genericAnnotation
    };
  }

  private handleFieldValue(field: Field, variant: Variant) {
    let res;
    if (field.name === '__typename') {
      const annotations = variant.possibleTypes
        .map(type => {
          const annotation = t.stringLiteralTypeAnnotation();
          annotation.value = type.toString();
          return annotation;
        });

      res = {
        name: field.name,
        annotation: t.unionTypeAnnotation(annotations)
      };
    } else {
      // TODO: Double check that this works
      res = {
        name: field.name,
        annotation: typeAnnotationFromGraphQLType(field.type)
      };
    }

    return res;
  }

  public get output() {
    return this.printer.print();
  }

  scopeStackPush(name: string) {
    this.scopeStack.push(name);
  }

  scopeStackPop() {
    const popped = this.scopeStack.pop()
  }

}
