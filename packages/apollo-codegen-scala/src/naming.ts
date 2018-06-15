import { camelCase, pascalCase } from 'change-case';
import * as Inflector from 'inflected';

import {
  join
} from 'apollo-codegen-core/lib/utilities/printing';

import {
  escapeIdentifierIfNeeded, Property
} from './language';

import {
  typeNameFromGraphQLType
} from './types';

import {
  GraphQLList,
  GraphQLNonNull,
  getNamedType,
  isCompositeType,
} from 'graphql';
import { LegacyCompilerContext, LegacyField, LegacyInlineFragment } from 'apollo-codegen-core/lib/compiler/legacyIR';
import { GraphQLInputField } from 'graphql';

export function enumCaseName(name: string) {
  return camelCase(name);
}

export function operationClassName(name: string) {
  return pascalCase(name);
}

export function caseClassNameForPropertyName(propertyName: string) {
  return pascalCase(Inflector.singularize(propertyName));
}

export function caseClassNameForFragmentName(fragmentName: string) {
  return pascalCase(fragmentName);
}

export function caseClassNameForInlineFragment(inlineFragment: LegacyInlineFragment) {
  return 'As' + pascalCase(String(inlineFragment.typeCondition));
}

export function propertyFromInputField(context: LegacyCompilerContext, field: GraphQLInputField, namespace?: string, parentCaseClassName?: string): GraphQLInputField & Property {
  const name = field.name;
  const unescapedPropertyName = isMetaFieldName(name) ? name : camelCase(name)
  const propertyName = escapeIdentifierIfNeeded(unescapedPropertyName);

  const type = field.type;
  const isList = type instanceof GraphQLList || type instanceof GraphQLList
  const isOptional = !(type instanceof GraphQLNonNull);
  const bareType = getNamedType(type);

  if (isCompositeType(bareType)) {
    const bareTypeName = join([
      namespace,
      parentCaseClassName,
      escapeIdentifierIfNeeded(pascalCase(Inflector.singularize(name)))
    ], '.');
    const typeName = typeNameFromGraphQLType(context, type, bareTypeName, isOptional, true);
    return { ...field, propertyName, typeName, isOptional, isList };
  } else {
    const typeName = typeNameFromGraphQLType(context, type, undefined, isOptional, true);
    return { ...field, propertyName, typeName, isOptional, isList };
  }
}

export function propertyFromLegacyField(context: LegacyCompilerContext, field: LegacyField, namespace?: string, parentCaseClassName?: string): LegacyField & Property {
  const name = field.responseName;
  const unescapedPropertyName = isMetaFieldName(name) ? name : camelCase(name)
  const propertyName = escapeIdentifierIfNeeded(unescapedPropertyName);

  const type = field.type;
  const isList = type instanceof GraphQLList || type instanceof GraphQLList
  const isOptional = field.isConditional || !(type instanceof GraphQLNonNull);
  const bareType = getNamedType(type);

  if (isCompositeType(bareType)) {
    const bareTypeName = join([
      namespace,
      parentCaseClassName,
      escapeIdentifierIfNeeded(pascalCase(Inflector.singularize(name)))
    ], '.');
    const typeName = typeNameFromGraphQLType(context, type, bareTypeName, isOptional);
    return { ...field, propertyName, typeName, isOptional, isList };
  } else {
    const typeName = typeNameFromGraphQLType(context, type, undefined, isOptional);
    return { ...field, propertyName, typeName, isOptional, isList };
  }
}

function isMetaFieldName(name: string) {
  return name.startsWith("__");
}
