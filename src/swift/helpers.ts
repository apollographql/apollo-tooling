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
  GraphQLInputField,
  GraphQLCompositeType
} from 'graphql';

import { camelCase, pascalCase } from 'change-case';
import * as Inflector from 'inflected';
import { join, wrap } from '../utilities/printing';

import { Property, Struct } from './language';

import { Field, TypeCondition, FragmentSpread } from '../compiler';

import { CompilerOptions, Argument } from '../compiler';
import { isMetaFieldName } from "../utilities/graphql";

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
      return `.object(${structName}.self)`;
    } else {
      throw new Error(`Unknown field type: ${type}`);
    }
  }

  // Names

  enumCaseName(name: string) {
    return camelCase(name);
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

  structNameForTypeCondition(type: GraphQLCompositeType) {
    return 'As' + pascalCase(type.name);
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

  propertyFromTypeCondition(typeCondition: TypeCondition): TypeCondition & Property & Struct {
    const structName = this.structNameForTypeCondition(typeCondition.type);

    return Object.assign({}, typeCondition, {
      propertyName: camelCase(structName),
      typeName: structName + '?',
      structName
    });
  }

  propertyFromFragmentSpread(fragmentSpread: FragmentSpread, isConditional: boolean): FragmentSpread & Property & Struct {
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

  // Expressions

  dictionaryLiteralForFieldArguments(args: Argument[]) {
    function expressionFromValue(value: any): string {
      if (value.kind === 'Variable') {
        return `Variable("${value.variableName}")`;
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

  mapExpressionForType(type: GraphQLType, expression: string, prefix = ''): string {
    let isOptional;
    if (type instanceof GraphQLNonNull) {
      isOptional = false;
      type = type.ofType;
    } else {
      isOptional = true;
    }

    if (type instanceof GraphQLList) {
      if (isOptional) {
        return `${prefix}.flatMap { $0.map { ${this.mapExpressionForType(type.ofType, expression, '$0')} } }`;
      } else {
        return `${prefix}.map { ${this.mapExpressionForType(type.ofType, expression, '$0')} }`;
      }
    } else if (isOptional) {
      return `${prefix}.flatMap { ${expression} }`;
    } else {
      return expression;
    }
  }
}
