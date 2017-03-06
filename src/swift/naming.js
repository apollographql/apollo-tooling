import { camelCase, pascalCase } from 'change-case';
import Inflector from 'inflected';

import {
  escapeIdentifierIfNeeded
} from './language';

import {
  typeNameFromGraphQLType
} from './types';

import {
  GraphQLError,
  GraphQLNonNull,
  getNamedType,
  isCompositeType,
} from 'graphql';

export function enumCaseName(name) {
  return camelCase(name);
}

export function operationClassName(name) {
  return pascalCase(name);
}

export function structNameForPropertyName(propertyName) {
  return pascalCase(Inflector.singularize(propertyName));
}

export function structNameForFragmentName(fragmentName) {
  return pascalCase(fragmentName);
}

export function structNameForInlineFragment(inlineFragment) {
  return 'As' + pascalCase(String(inlineFragment.typeCondition));
}

export function propertiesFromSelectionSet(context, selectionSet) {
  return selectionSet.map(selection => {
    if (selection.kind === 'Field') {
      return propertyFromField(context, selection);
    } else if (selection.kind === 'InlineFragment') {
      return propertyFromInlineFragment(context, selection);
    } else if (selection.kind === 'FragmentSpread') {
      return propertyFromFragmentSpread(context, selection);
    }
  });
}

export function propertyFromField(context, field) {
  const name = field.name || field.responseName;
  const propertyName = escapeIdentifierIfNeeded(name);

  const type = field.type;
  const isOptional = field.isConditional || !(type instanceof GraphQLNonNull);
  const bareType = getNamedType(type);

  if (isCompositeType(bareType)) {
    const bareTypeName = escapeIdentifierIfNeeded(pascalCase(Inflector.singularize(name)));
    const typeName = typeNameFromGraphQLType(context, type, bareTypeName, isOptional);
    return { ...field, propertyName, typeName, bareTypeName, isOptional, isComposite: true };
  } else {
    const typeName = typeNameFromGraphQLType(context, type, undefined, isOptional);
    return { ...field, propertyName, typeName, isOptional, isComposite: false };
  }
}

export function propertyFromInlineFragment(context, inlineFragment) {
  const bareTypeName = structNameForInlineFragment(inlineFragment);
  const propertyName = camelCase(bareTypeName);
  const typeName = bareTypeName + '?'
  return { propertyName, typeName, bareTypeName, ...inlineFragment };
}

export function propertyFromFragmentSpread(context, fragmentSpread) {
  const fragmentName = fragmentSpread.fragmentName;
  const fragment = context.fragments[fragmentName];
  if (!fragment) {
    throw new GraphQLError(`Cannot find fragment "${fragmentName}"`);
  }
  const propertyName = camelCase(fragmentName);
  const typeName = structNameForFragmentName(fragmentName);
  return { propertyName, typeName, fragment, ...fragmentSpread };
}
