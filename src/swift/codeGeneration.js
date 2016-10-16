import {
  GraphQLError,
  getNamedType,
  isCompositeType,
  isAbstractType,
  isEqualType,
  GraphQLScalarType,
  GraphQLEnumType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLID,
  GraphQLInputObjectType
} from 'graphql'

import  { isTypeProperSuperTypeOf } from '../utilities/graphql'

import { camelCase, pascalCase } from 'change-case';
import Inflector from 'inflected';

import {
  join,
  wrap,
} from '../utilities/printing';

import {
  classDeclaration,
  structDeclaration,
  propertyDeclaration,
  propertyDeclarations
} from './language';

import { escapedString, multilineString } from './strings';

import {
  typeNameFromGraphQLType,
} from './types';

import CodeGenerator from '../utilities/CodeGenerator';

export function generateSource(context) {
  const generator = new CodeGenerator(context);

  generator.printOnNewline('//  This file was automatically generated and should not be edited.');
  generator.printNewline();
  generator.printOnNewline('import Apollo');

  context.typesUsed.forEach(type => {
    typeDeclarationForGraphQLType(generator, type);
  });

  Object.values(context.operations).forEach(operation => {
    classDeclarationForOperation(generator, operation);
  });

  Object.values(context.fragments).forEach(fragment => {
    structDeclarationForFragment(generator, fragment);
  });

  return generator.output;
}

export function classDeclarationForOperation(
  generator,
  {
    operationName,
    operationType,
    variables,
    fields,
    fragmentsReferenced,
    source,
  }
) {

  let className;
  let protocol;

  switch (operationType) {
    case 'query':
      className = `${pascalCase(operationName)}Query`;
      protocol = 'GraphQLQuery';
      break;
    case 'mutation':
      className = `${pascalCase(operationName)}Mutation`;
      protocol = 'GraphQLMutation';
      break;
    default:
      throw new GraphQLError(`Unsupported operation type "${operationType}"`);
  }

  classDeclaration(generator, {
    className,
    modifiers: ['public', 'final'],
    adoptedProtocols: [protocol]
  }, () => {
    if (source) {
      generator.printOnNewline('public static let operationDefinition =');
      generator.withIndent(() => {
        multilineString(generator, source);
      });
    }

    if (fragmentsReferenced && fragmentsReferenced.length > 0) {
      generator.printOnNewline('public static let queryDocument = operationDefinition');
      fragmentsReferenced.forEach(fragment => {
        generator.print(`.appending(${typeNameForFragmentName(fragment)}.fragmentDefinition)`)
      });
    }

    if (variables && variables.length > 0) {
      const properties = propertiesFromFields(generator.context, variables);
      generator.printNewlineIfNeeded();
      propertyDeclarations(generator, properties);
      generator.printNewlineIfNeeded();
      initializerDeclarationForProperties(generator, properties);
      generator.printNewlineIfNeeded();
      mappedProperty(generator, { propertyName: 'variables', propertyType: 'GraphQLMap?' }, properties);
    }

    structDeclarationForSelectionSet(
      generator,
      {
        structName: "Data",
        fields
      }
    );
  });
}

export function initializerDeclarationForProperties(generator, properties) {
  generator.printOnNewline(`public init`);
  generator.print('(');
  generator.print(join(properties.map(({ propertyName, fieldType }) =>
    join([
      `${propertyName}: ${typeNameFromGraphQLType(generator.context, fieldType)}`,
      !(fieldType instanceof GraphQLNonNull) && ' = nil'
    ])
  ), ', '));
  generator.print(')');

  generator.withinBlock(() => {
    properties.forEach(({ propertyName }) => {
      generator.printOnNewline(`self.${propertyName} = ${propertyName}`);
    });
  });
}

export function mappedProperty(generator, { propertyName, propertyType }, properties) {
  generator.printOnNewline(`public var ${propertyName}: ${propertyType}`);
  generator.withinBlock(() => {
    generator.printOnNewline(wrap(
      `return [`,
      join(properties.map(({ propertyName }) => `"${propertyName}": ${propertyName}`), ', '),
      `]`
    ));
  });
}

export function structDeclarationForFragment(
  generator,
  {
    fragmentName,
    typeCondition,
    fields,
    inlineFragments,
    fragmentSpreads,
    source
  }
) {
  const structName = pascalCase(fragmentName);

  structDeclarationForSelectionSet(generator, {
    structName,
    adoptedProtocols: ['GraphQLNamedFragment'],
    parentType: typeCondition,
    possibleTypes: possibleTypesForType(generator.context, typeCondition),
    fields,
    fragmentSpreads,
    inlineFragments
  }, () => {
    if (source) {
      generator.printOnNewline('public static let fragmentDefinition =');
      generator.withIndent(() => {
        multilineString(generator, source);
      });
    }
  });
}

export function structDeclarationForSelectionSet(
  generator,
  {
    structName,
    adoptedProtocols = ['GraphQLMapConvertible'],
    parentType,
    possibleTypes,
    fields,
    fragmentSpreads,
    inlineFragments
  },
  beforeClosure
) {
  structDeclaration(generator, { structName, adoptedProtocols }, () => {
    if (beforeClosure) {
      beforeClosure();
    }

    if (possibleTypes) {
      generator.printNewlineIfNeeded();
      generator.printOnNewline('public static let possibleTypes = [');
      generator.print(join(possibleTypes.map(type => `"${String(type)}"`), ', '));
      generator.print(']');
    }

    const properties = fields && propertiesFromFields(generator.context, fields);

    const fragmentProperties = fragmentSpreads && fragmentSpreads.map(fragmentName => {
      const fragment = generator.context.fragments[fragmentName];
      if (!fragment) {
        throw new GraphQLError(`Cannot find fragment "${fragmentName}"`);
      }
      const propertyName = camelCase(fragmentName);
      const typeName = typeNameForFragmentName(fragmentName);
      const isProperSuperType = isTypeProperSuperTypeOf(generator.context.schema, fragment.typeCondition, parentType);
      return { propertyName, typeName, bareTypeName: typeName, isProperSuperType };
    });

    const inlineFragmentProperties = inlineFragments && inlineFragments.map(inlineFragment => {
      const bareTypeName = 'As' + pascalCase(String(inlineFragment.typeCondition));
      const propertyName = camelCase(bareTypeName);
      const typeName = bareTypeName + '?'
      return { ...inlineFragment, propertyName, typeName, bareTypeName };
    });

    generator.printNewlineIfNeeded();

    if (parentType) {
      generator.printOnNewline('public let __typename');

      if (isAbstractType(parentType)) {
        generator.print(`: String`);
      } else {
        generator.print(` = "${String(parentType)}"`);
      }
    }

    propertyDeclarations(generator, properties);

    if (fragmentProperties && fragmentProperties.length > 0) {
      generator.printNewlineIfNeeded();
      propertyDeclaration(generator, { propertyName: 'fragments', typeName: 'Fragments' })
    }

    if (inlineFragmentProperties && inlineFragmentProperties.length > 0) {
      generator.printNewlineIfNeeded();
      propertyDeclarations(generator, inlineFragmentProperties);
    }

    generator.printNewlineIfNeeded();
    generator.printOnNewline('public init(map: GraphQLMap) throws');
    generator.withinBlock(() => {
      if (parentType && isAbstractType(parentType)) {
        generator.printOnNewline(`__typename = try map.value(forKey: "__typename")`);
      }

      if (properties) {
        properties.forEach(property => initializationForProperty(generator, property));
      }

      if (fragmentProperties && fragmentProperties.length > 0) {
        generator.printNewlineIfNeeded();
        fragmentProperties.forEach(({ propertyName, typeName, bareTypeName, isProperSuperType }) => {
          generator.printOnNewline(`let ${propertyName} = try ${typeName}(map: map`);
          if (isProperSuperType) {
            generator.print(')');
          } else {
            generator.print(`, ifTypeMatches: __typename)`);
          }
        });
        generator.printOnNewline(`fragments = Fragments(`);
        generator.print(join(fragmentSpreads.map(fragmentName => {
          const propertyName = camelCase(fragmentName);
          return `${propertyName}: ${propertyName}`;
        }), ', '));
        generator.print(')');
      }

      if (inlineFragmentProperties && inlineFragmentProperties.length > 0) {
        generator.printNewlineIfNeeded();
        inlineFragmentProperties.forEach(({ propertyName, typeName, bareTypeName }) => {
          generator.printOnNewline(`${propertyName} = try ${bareTypeName}(map: map, ifTypeMatches: __typename)`);
        });
      }
    });

    if (fragmentProperties && fragmentProperties.length > 0) {
      structDeclaration(
        generator,
        {
          structName: 'Fragments'
        },
        () => {
          fragmentProperties.forEach(({ propertyName, typeName, isProperSuperType }) => {
            if (!isProperSuperType) {
              typeName += '?';
            }
            propertyDeclaration(generator, { propertyName, typeName });
          })
        }
      );
    }

    if (inlineFragmentProperties && inlineFragmentProperties.length > 0) {
      inlineFragmentProperties.forEach(property => {
        structDeclarationForSelectionSet(
          generator,
          {
            structName: property.bareTypeName,
            parentType: property.typeCondition,
            possibleTypes: possibleTypesForType(generator.context, property.typeCondition),
            adoptedProtocols: ['GraphQLConditionalFragment'],
            fields: property.fields,
            fragmentSpreads: property.fragmentSpreads
          }
        );
      });
    }

    if (properties) {
      properties.filter(property => property.isComposite).forEach(property => {
        structDeclarationForSelectionSet(
          generator,
          {
            structName: structNameForProperty(property),
            parentType: getNamedType(property.fieldType),
            fields: property.fields,
            fragmentSpreads: property.fragmentSpreads,
            inlineFragments: property.inlineFragments
          }
        );
      });
    }
  });
}

export function initializationForProperty(generator, { propertyName, fieldName, fieldType }) {
  const isOptional = !(fieldType instanceof GraphQLNonNull || fieldType.ofType instanceof GraphQLNonNull);
  const isList = fieldType instanceof GraphQLList || fieldType.ofType instanceof GraphQLList;

  const methodName = isOptional ? (isList ? 'optionalList' : 'optionalValue') : (isList ? 'list' : 'value');

  const args = [`forKey: "${fieldName}"`];

  generator.printOnNewline(`${propertyName} = try map.${methodName}(${ join(args, ', ') })`);
}

export function propertiesFromFields(context, fields) {
  return fields.map(field => propertyFromField(context, field));
}

export function propertyFromField(context, field) {
  const { name: fieldName, type: fieldType, description, fragmentSpreads, inlineFragments } = field;

  const propertyName = camelCase(fieldName);

  let property = { fieldName, fieldType, propertyName, description };

  const namedType = getNamedType(fieldType);

  if (isCompositeType(namedType)) {
    const bareTypeName = pascalCase(Inflector.singularize(propertyName));
    const typeName = typeNameFromGraphQLType(context, fieldType, bareTypeName);
    return { ...property, typeName, bareTypeName, fields: field.fields, isComposite: true, fragmentSpreads, inlineFragments };
  } else {
    const typeName = typeNameFromGraphQLType(context, fieldType);
    return { ...property, typeName, isComposite: false };
  }
}

export function structNameForProperty(property) {
  return pascalCase(Inflector.singularize(property.fieldName));
}

export function typeNameForFragmentName(fragmentName) {
  return pascalCase(fragmentName);
}

export function possibleTypesForType(context, type) {
  if (isAbstractType(type)) {
    return context.schema.getPossibleTypes(type);
  } else {
    return [type];
  }
}

export function typeDeclarationForGraphQLType(generator, type) {
  if (type instanceof GraphQLEnumType) {
    enumerationDeclaration(generator, type);
  } else if (type instanceof GraphQLInputObjectType) {
    structDeclarationForInputObjectType(generator, type);
  }
}

function enumerationDeclaration(generator, type) {
  const { name, description } = type;
  const values = type.getValues();

  generator.printNewlineIfNeeded();
  generator.printOnNewline(description && `/// ${description}`);
  generator.printOnNewline(`public enum ${name}: String`);
  generator.withinBlock(() => {
    values.forEach(value =>
      generator.printOnNewline(`case ${camelCase(value.name)} = "${value.value}"${wrap(' /// ', value.description)}`)
    );
  });
  generator.printNewline();
  generator.printOnNewline(`extension ${name}: JSONDecodable, JSONEncodable {}`);
}

function structDeclarationForInputObjectType(generator, type) {
  const { name: structName, description } = type;
  const adoptedProtocols = ['JSONEncodable'];
  const properties = propertiesFromFields(generator.context, Object.values(type.getFields()));

  structDeclaration(generator, { structName, description, adoptedProtocols }, () => {
    propertyDeclarations(generator, properties);
    generator.printNewline();
    mappedProperty(generator, { propertyName: 'jsonValue', propertyType: 'JSONValue' }, properties);
  });
}
