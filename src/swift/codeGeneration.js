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

import {
  join,
  wrap,
} from '../utilities/printing';

import {
  namespaceDeclaration,
  classDeclaration,
  structDeclaration,
  propertyDeclaration,
  propertyDeclarations,
  escapeIdentifierIfNeeded
} from './language';

import {
  structNameForPropertyName,
  structNameForFragmentName,
  structNameForInlineFragment,
  operationClassName,
  enumCaseName,
  propertiesFromSelectionSet,
  propertyFromField,
} from './naming';

import {
  escapedString,
  multilineString,
  dictionaryLiteralForFieldArguments,
} from './values';

import {
  possibleTypesForType,
  typeNameFromGraphQLType,
  fieldTypeEnum,
} from './types';

import CodeGenerator from '../utilities/CodeGenerator';

export function generateSource(context) {
  const generator = new CodeGenerator(context);

  generator.printOnNewline('//  This file was automatically generated and should not be edited.');
  generator.printNewline();
  generator.printOnNewline('import Apollo');

  namespaceDeclaration(generator, context.namespace, () => {

    context.typesUsed.forEach(type => {
      typeDeclarationForGraphQLType(generator, type);
    });

    Object.values(context.operations).forEach(operation => {
      classDeclarationForOperation(generator, { ...operation, selectionSet: selectionSetFrom(operation) });
    });

    Object.values(context.fragments).forEach(fragment => {
      structDeclarationForFragment(generator, { ...fragment, selectionSet: selectionSetFrom(fragment) });
    });
  })

  return generator.output;
}

function selectionSetFrom({ fields, inlineFragments, fragmentSpreads }) {
  let selectionSet = [];

  fields && fields.forEach(field => {
    selectionSet.push({ kind: 'Field', ...field, selectionSet: selectionSetFrom(field) });
  });

  inlineFragments && inlineFragments.forEach(inlineFragment => {
    selectionSet.push({ kind: 'InlineFragment', ...inlineFragment, selectionSet: selectionSetFrom(inlineFragment) });
  });

  fragmentSpreads && fragmentSpreads.forEach(fragmentSpread => {
    selectionSet.push({ kind: 'FragmentSpread', fragmentName: fragmentSpread });
  });

  return selectionSet;
}

export function classDeclarationForOperation(
  generator,
  {
    operationName,
    operationType,
    variables,
    selectionSet,
    fragmentsReferenced,
    source,
  }
) {
  let className;
  let protocol;

  switch (operationType) {
    case 'query':
      className = `${operationClassName(operationName)}Query`;
      protocol = 'GraphQLQuery';
      break;
    case 'mutation':
      className = `${operationClassName(operationName)}Mutation`;
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
      generator.printOnNewline('public static let operationString =');
      generator.withIndent(() => {
        multilineString(generator, source);
      });
    }

    if (fragmentsReferenced && fragmentsReferenced.length > 0) {
      generator.printOnNewline('public static var requestString: String { return operationString');
      fragmentsReferenced.forEach(fragment => {
        generator.print(`.appending(${structNameForFragmentName(fragment)}.fragmentString)`)
      });
      generator.print(' }');
    }

    generator.printNewlineIfNeeded();

    generator.printOnNewline('public static let selectionSet: [Selection] = ');
    selectionSetInitialization(generator, selectionSet, 'Data');

    generator.printNewlineIfNeeded();

    if (variables && variables.length > 0) {
      const properties = variables.map(({ name, type }) => {
        const propertyName = escapeIdentifierIfNeeded(name);
        const typeName = typeNameFromGraphQLType(generator.context, type);
        const isOptional = !(type instanceof GraphQLNonNull || type.ofType instanceof GraphQLNonNull);
        return { name, propertyName, type, typeName, isOptional };
      });
      propertyDeclarations(generator, properties);
      generator.printNewlineIfNeeded();
      initializerDeclarationForProperties(generator, properties);
      generator.printNewlineIfNeeded();
      generator.printOnNewline(`public var variables: GraphQLMap?`);
      generator.withinBlock(() => {
        generator.printOnNewline(wrap(
          `return [`,
          join(properties.map(({ name, propertyName }) => `"${name}": ${propertyName}`), ', ') || ':',
          `]`,
        ));
      });
    } else {
      initializerDeclarationForProperties(generator, []);
    }

    structDeclarationForSelectionSet(
      generator,
      {
        structName: "Data",
        selectionSet
      }
    );
  });
}

export function structDeclarationForFragment(
  generator,
  {
    fragmentName,
    typeCondition,
    selectionSet,
    source
  }
) {
  const structName = structNameForFragmentName(fragmentName);

  structDeclarationForSelectionSet(generator, {
    structName,
    adoptedProtocols: ['GraphQLFragment'],
    parentType: typeCondition,
    possibleTypes: possibleTypesForType(generator.context, typeCondition),
    selectionSet
  }, () => {
    if (source) {
      generator.printOnNewline('public static let fragmentString =');
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
    adoptedProtocols = ['GraphQLMappable'],
    parentType,
    possibleTypes,
    selectionSet
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

      generator.printNewlineIfNeeded();
      generator.printOnNewline('public static let selectionSet: [Selection] = ');
      selectionSetInitialization(generator, selectionSet, structName);
    }

    generator.printNewlineIfNeeded();

    const properties = propertiesFromSelectionSet(generator.context, selectionSet);

    properties.forEach(({ kind, propertyName, typeName }) => {
      if (kind === 'FragmentSpread') return;

      propertyDeclaration(generator, {
        propertyName,
        typeName
      });
    });

    const fields = properties.filter(property => property.kind === 'Field');
    const inlineFragments = properties.filter(property => property.kind === 'InlineFragment');
    const fragmentSpreads = properties.filter(property => property.kind === 'FragmentSpread').map(fragmentSpread => {
      if (!isTypeProperSuperTypeOf(generator.context.schema, fragmentSpread.fragment.typeCondition, parentType)) {
        fragmentSpread.typeName += '?';
      }
      return fragmentSpread;
    });

    if (fragmentSpreads.length > 0) {
      generator.printNewlineIfNeeded();
      propertyDeclaration(generator, { propertyName: 'fragments', typeName: 'Fragments' })
    }

    generator.printNewlineIfNeeded();
    generator.printOnNewline('public init(values: [Any?])');
    generator.withinBlock(() => {
      properties.forEach(({ kind, propertyName, typeName }, index) => {
        if (kind == 'FragmentSpread') {
          generator.printOnNewline(`let ${propertyName} = values[${index}] as! ${typeName}`);
        } else {
          generator.printOnNewline(`${propertyName} = values[${index}] as! ${typeName}`);
        }
      });

      if (fragmentSpreads.length > 0) {
        generator.printNewlineIfNeeded();
        generator.printOnNewline(`fragments = Fragments(`);
        generator.print(join(fragmentSpreads.map(({ propertyName }) => {
          return `${propertyName}: ${propertyName}`;
        }), ', '));
        generator.print(')');
      }
    });

    if (inlineFragments.length > 0) {
      inlineFragments.forEach(({ bareTypeName, typeCondition, selectionSet }) => {
        structDeclarationForSelectionSet(
          generator,
          {
            structName: bareTypeName,
            parentType: typeCondition,
            possibleTypes: possibleTypesForType(generator.context, typeCondition),
            adoptedProtocols: ['GraphQLFragment'],
            selectionSet: selectionSet
          }
        );
      });
    }

    if (fragmentSpreads.length > 0) {
      structDeclaration(
        generator,
        {
          structName: 'Fragments'
        },
        () => {
          fragmentSpreads.forEach(({ propertyName, typeName })  => {
            propertyDeclaration(generator, { propertyName, typeName });
          })
        }
      );
    }

    fields.filter(field => isCompositeType(getNamedType(field.type))).forEach(field => {
      structDeclarationForSelectionSet(
        generator,
        {
          structName: structNameForPropertyName(field.responseName),
          parentType: getNamedType(field.type),
          selectionSet: field.selectionSet
        }
      );
    });
  });
}

export function initializerDeclarationForProperties(generator, properties) {
  generator.printOnNewline(`public init`);
  generator.print('(');
  generator.print(join(properties.map(({ propertyName, type, typeName, isOptional }) =>
    join([
      `${propertyName}: ${typeName}`,
      isOptional && ' = nil'
    ])
  ), ', '));
  generator.print(')');

  generator.withinBlock(() => {
    properties.forEach(({ propertyName }) => {
      generator.printOnNewline(`self.${propertyName} = ${propertyName}`);
    });
  });
}

export function selectionSetInitialization(generator, selectionSet, parentStructName) {
  generator.print('[');
  generator.withIndent(() => {
    selectionSet.forEach(selection => {
      if (selection.kind === 'Field') {
        const { responseName, fieldName, args, type, selectionSet: fieldSelectionSet } = selection;
        const structName = join([parentStructName, structNameForPropertyName(responseName)], '.');

        generator.printOnNewline(`Field(`);
        generator.print(join([
          `"${fieldName}"`,
          responseName != fieldName ? `alias: "${responseName}"` : null,
          args && args.length && `arguments: ${dictionaryLiteralForFieldArguments(args)}`,
          `type: ${fieldTypeEnum(generator.context, type, structName)}`
        ], ', '));
        if (fieldSelectionSet && fieldSelectionSet.length > 0) {
          generator.print(', selectionSet: ');
          selectionSetInitialization(generator, selection.selectionSet, structName)
        }
        generator.print('),');
      } else if (selection.kind === 'FragmentSpread') {
        const structName = structNameForFragmentName(selection.fragmentName);
        generator.printOnNewline(`FragmentSpread(${structName}.self),`);
      } else if (selection.kind === 'InlineFragment') {
        const structName = join([parentStructName, structNameForInlineFragment(selection)], '.');
        generator.printOnNewline(`FragmentSpread(${structName}.self),`);
      }
    });
  });
  generator.printOnNewline(']');
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
      generator.printOnNewline(`case ${escapeIdentifierIfNeeded(enumCaseName(value.name))} = "${value.value}"${wrap(' /// ', value.description)}`)
    );
  });
  generator.printNewline();
  generator.printOnNewline(`extension ${name}: JSONDecodable, JSONEncodable {}`);
}

function structDeclarationForInputObjectType(generator, type) {
  const { name: structName, description } = type;
  const adoptedProtocols = ['GraphQLMapConvertible'];
  const fields = Object.values(type.getFields());
  const properties = fields.map(field => propertyFromField(generator.context, field));

  structDeclaration(generator, { structName, description, adoptedProtocols }, () => {
    generator.printOnNewline(`public var graphQLMap: GraphQLMap`);

    generator.printNewlineIfNeeded();
    generator.printOnNewline(`public init`);
    generator.print('(');
    generator.print(join(properties.map(({ propertyName, type, typeName, isOptional }) =>
      join([
        `${propertyName}: ${typeName}`,
        isOptional && ' = nil'
      ])
    ), ', '));
    generator.print(')');

    generator.withinBlock(() => {
      generator.printOnNewline(wrap(
        `graphQLMap = [`,
        join(properties.map(({ name, propertyName }) => `"${name}": ${propertyName}`), ', ') || ':',
        `]`
      ));
    });
  });
}
