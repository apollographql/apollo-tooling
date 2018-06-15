import {
  GraphQLType,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLEnumType,
  isCompositeType,
  getNamedType,
  GraphQLInputField
} from 'graphql';

import { camelCase, pascalCase } from 'change-case';
import * as Inflector from 'inflected';
import { join, wrap } from 'apollo-codegen-core/lib/utilities/printing';

import { Property, Struct } from './language';

import { CompilerOptions, SelectionSet, Field, FragmentSpread, Argument } from 'apollo-codegen-core/lib/compiler';
import { isMetaFieldName } from 'apollo-codegen-core/lib/utilities/graphql';
import { Variant } from 'apollo-codegen-core/lib/compiler/visitors/typeCase';
import { collectAndMergeFields } from 'apollo-codegen-core/lib/compiler/visitors/collectAndMergeFields';

const builtInScalarMap = {
  [GraphQLString.name]: 'String',
  [GraphQLInt.name]: 'Int',
  [GraphQLFloat.name]: 'Double',
  [GraphQLBoolean.name]: 'Bool',
  [GraphQLID.name]: 'GraphQLID'
};

export class Helpers {
  constructor(public options: CompilerOptions) {}

  // Types

  typeNameFromGraphQLType(type: GraphQLType, unmodifiedTypeName?: string, isOptional?: boolean): string {
    if (type instanceof GraphQLNonNull) {
      return this.typeNameFromGraphQLType(type.ofType, unmodifiedTypeName, false);
    } else if (isOptional === undefined) {
      isOptional = true;
    }

    let typeName;
    if (type instanceof GraphQLList) {
      typeName = '[' + this.typeNameFromGraphQLType(type.ofType, unmodifiedTypeName) + ']';
    } else if (type instanceof GraphQLScalarType) {
      typeName = this.typeNameForScalarType(type);
    } else {
      typeName = unmodifiedTypeName || type.name;
    }

    return isOptional ? typeName + '?' : typeName;
  }

  typeNameForScalarType(type: GraphQLScalarType): string {
    return (
      builtInScalarMap[type.name] ||
      (this.options.passthroughCustomScalars
        ? this.options.customScalarsPrefix + type.name
        : GraphQLString.name)
    );
  }

  fieldTypeEnum(type: GraphQLType, structName: string): string {
    if (type instanceof GraphQLNonNull) {
      return `.nonNull(${this.fieldTypeEnum(type.ofType, structName)})`;
    } else if (type instanceof GraphQLList) {
      return `.list(${this.fieldTypeEnum(type.ofType, structName)})`;
    } else if (type instanceof GraphQLScalarType) {
      return `.scalar(${this.typeNameForScalarType(type)}.self)`;
    } else if (type instanceof GraphQLEnumType) {
      return `.scalar(${type.name}.self)`;
    } else if (isCompositeType(type)) {
      return `.object(${structName}.selections)`;
    } else {
      throw new Error(`Unknown field type: ${type}`);
    }
  }

  // Names

  enumCaseName(name: string) {
    return camelCase(name);
  }

  enumDotCaseName(name: string) {
    return `.${camelCase(name)}`;
  }

  operationClassName(name: string) {
    return pascalCase(name);
  }

  structNameForPropertyName(propertyName: string) {
    return pascalCase(Inflector.singularize(propertyName));
  }

  structNameForFragmentName(fragmentName: string) {
    return pascalCase(fragmentName);
  }

  structNameForVariant(variant: SelectionSet) {
    return 'As' + variant.possibleTypes.map(type => pascalCase(type.name)).join('Or');
  }

  // Properties

  propertyFromField(field: Field, namespace?: string): Field & Property & Struct {
    const { responseKey, isConditional } = field;

    const propertyName = isMetaFieldName(responseKey) ? responseKey : camelCase(responseKey);

    const structName = join([namespace, this.structNameForPropertyName(responseKey)], '.');

    let type = field.type;

    if (isConditional && type instanceof GraphQLNonNull) {
      type = type.ofType;
    }

    const isOptional = !(type instanceof GraphQLNonNull);

    const unmodifiedType = getNamedType(field.type);

    const unmodifiedTypeName = isCompositeType(unmodifiedType) ? structName : unmodifiedType.name;

    const typeName = this.typeNameFromGraphQLType(type, unmodifiedTypeName);

    return Object.assign({}, field, {
      responseKey,
      propertyName,
      typeName,
      structName,
      isOptional
    });
  }

  propertyFromVariant(variant: Variant): Variant & Property & Struct {
    const structName = this.structNameForVariant(variant);

    return Object.assign(variant, {
      propertyName: camelCase(structName),
      typeName: structName + '?',
      structName
    });
  }

  propertyFromFragmentSpread(
    fragmentSpread: FragmentSpread,
    isConditional: boolean
  ): FragmentSpread & Property & Struct {
    const structName = this.structNameForFragmentName(fragmentSpread.fragmentName);

    return Object.assign({}, fragmentSpread, {
      propertyName: camelCase(fragmentSpread.fragmentName),
      typeName: isConditional ? structName + '?' : structName,
      structName,
      isConditional
    });
  }

  propertyFromInputField(field: GraphQLInputField) {
    return Object.assign({}, field, {
      propertyName: camelCase(field.name),
      typeName: this.typeNameFromGraphQLType(field.type),
      isOptional: !(field.type instanceof GraphQLNonNull)
    });
  }

  propertiesForSelectionSet(
    selectionSet: SelectionSet,
    namespace?: string
  ): (Field & Property & Struct)[] | undefined {
    const properties = collectAndMergeFields(selectionSet, true)
      .filter(field => field.name !== '__typename')
      .map(field => this.propertyFromField(field, namespace));

    // If we're not merging in fields from fragment spreads, there is no guarantee there will a generated
    // type for a composite field, so to avoid compiler errors we skip the initializer for now.
    if (
      selectionSet.selections.some(selection => selection.kind === 'FragmentSpread') &&
      properties.some(property => isCompositeType(getNamedType(property.type)))
    ) {
      return undefined;
    }

    return properties;
  }

  // Expressions

  dictionaryLiteralForFieldArguments(args: Argument[]) {
    function expressionFromValue(value: any): string {
      if (value.kind === 'Variable') {
        return `GraphQLVariable("${value.variableName}")`;
      } else if (Array.isArray(value)) {
        return wrap('[', join(value.map(expressionFromValue), ', '), ']');
      } else if (typeof value === 'object') {
        return wrap(
          '[',
          join(
            Object.entries(value).map(([key, value]) => {
              return `"${key}": ${expressionFromValue(value)}`;
            }),
            ', '
          ) || ':',
          ']'
        );
      } else {
        return JSON.stringify(value);
      }
    }

    return wrap(
      '[',
      join(
        args.map(arg => {
          return `"${arg.name}": ${expressionFromValue(arg.value)}`;
        }),
        ', '
      ) || ':',
      ']'
    );
  }

  mapExpressionForType(
    type: GraphQLType,
    isConditional: boolean = false,
    makeExpression: (expression: string) => string,
    expression: string,
    inputTypeName: string,
    outputTypeName: string
  ): string {
    let isOptional;
    if (type instanceof GraphQLNonNull) {
      isOptional = !!isConditional;
      type = type.ofType;
    } else {
      isOptional = true;
    }

    if (type instanceof GraphQLList) {
      const elementType = type.ofType;
      if (isOptional) {
        return `${expression}.flatMap { ${makeClosureSignature(
          this.typeNameFromGraphQLType(type, inputTypeName, false),
          this.typeNameFromGraphQLType(type, outputTypeName, false)
        )} value.map { ${makeClosureSignature(
          this.typeNameFromGraphQLType(elementType, inputTypeName),
          this.typeNameFromGraphQLType(elementType, outputTypeName)
        )} ${this.mapExpressionForType(
          elementType,
          undefined,
          makeExpression,
          'value',
          inputTypeName,
          outputTypeName
        )} } }`;
      } else {
        return `${expression}.map { ${makeClosureSignature(
          this.typeNameFromGraphQLType(elementType, inputTypeName),
          this.typeNameFromGraphQLType(elementType, outputTypeName)
        )} ${this.mapExpressionForType(
          elementType,
          undefined,
          makeExpression,
          'value',
          inputTypeName,
          outputTypeName
        )} }`;
      }
    } else if (isOptional) {
      return `${expression}.flatMap { ${makeClosureSignature(
        this.typeNameFromGraphQLType(type, inputTypeName, false),
        this.typeNameFromGraphQLType(type, outputTypeName, false)
      )} ${makeExpression('value')} }`;
    } else {
      return makeExpression(expression);
    }
  }
}

function makeClosureSignature(parameterTypeName: string, returnTypeName?: string) {
  let closureSignature = `(value: ${parameterTypeName})`;

  if (returnTypeName) {
    closureSignature += ` -> ${returnTypeName}`;
  }
  closureSignature += ' in';
  return closureSignature;
}
