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
    rootType,
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
        parentType: rootType,
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
    adoptedProtocols = ['GraphQLSelectionSet'],
    parentType,
    selectionSet
  },
  beforeClosure
) {
  const possibleTypes = parentType ? possibleTypesForType(generator.context, parentType) : null;

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

    generator.printNewlineIfNeeded();
    generator.printOnNewline('public static let selections: [Selection] = ');
    selectionSetInitialization(generator, selectionSet, structName);

    generator.printNewlineIfNeeded();

    propertyDeclaration(generator, { propertyName: "snapshot", typeName: "Snapshot" });

    generator.printNewlineIfNeeded();
    generator.printOnNewline('public init(snapshot: Snapshot)');
    generator.withinBlock(() => {
      generator.printOnNewline(`self.snapshot = snapshot`);
    });

    const properties = propertiesFromSelectionSet(generator.context, selectionSet);

    const fields = properties.filter(property => property.kind === 'Field' && property.propertyName !== '__typename');
    const inlineFragments = properties.filter(property => property.kind === 'InlineFragment');
    const fragmentSpreads = properties.filter(property => property.kind === 'FragmentSpread');

    if (!possibleTypes || possibleTypes.length == 1) {
      generator.printNewlineIfNeeded();
      generator.printOnNewline(`public init`);
      generator.print('(');
      generator.print(join(fields.map(({ propertyName, type, typeName, isOptional }) =>
        join([
          `${propertyName}: ${typeName}`,
          isOptional && ' = nil'
        ])
      ), ', '));
      generator.print(')');

      generator.withinBlock(() => {
        generator.printOnNewline(wrap(
          `self.init(snapshot: [`,
          join([
            possibleTypes && possibleTypes.length > 0 && `"__typename": "${possibleTypes[0]}"`,
            ...fields.map(({ name, propertyName }) => `"${propertyName}": ${propertyName}`)
          ], ', ') || ':',
          `])`
        ));
      });
    } else {
      possibleTypes.forEach(possibleType => {
        generator.printNewlineIfNeeded();
        generator.printOnNewline(`public static func make${possibleType}`);
        generator.print('(');

        const inlineFragment = inlineFragments.find(inlineFragment => inlineFragment.typeCondition === possibleType);
        let properties;
        if (inlineFragment) {
          properties = propertiesFromSelectionSet(generator.context, inlineFragment.selectionSet, inlineFragment.structName);
        } else {
          properties = propertiesFromSelectionSet(generator.context, selectionSet);
        }
        const fields = properties.filter(property => property.kind === 'Field' && property.propertyName !== '__typename');

        generator.print(join(fields.map(({ propertyName, type, typeName, isOptional }) =>
          join([
            `${propertyName}: ${typeName}`,
            isOptional && ' = nil'
          ])
        ), ', '));
        generator.print(`) -> ${structName}`);

        generator.withinBlock(() => {
          generator.printOnNewline(wrap(
            `return ${structName}(snapshot: [`,
            join([
              `"__typename": "${possibleType}"`,
              ...fields.map(({ name, propertyName }) => `"${propertyName}": ${propertyName}`)
            ], ', '),
            `])`
          ));
        });
      });
    }

    properties.forEach(property => {
      if (property.kind === 'FragmentSpread') return;

      generator.printNewlineIfNeeded();
      propertyDeclarationForSelection(generator, property);
    });

    if (fragmentSpreads.length > 0) {
      generator.printNewlineIfNeeded();
      generator.printOnNewline(`public var fragments: Fragments`);
      generator.withinBlock(() => {
        generator.printOnNewline("get");
        generator.withinBlock(() => {
          generator.printOnNewline(`return Fragments(snapshot: snapshot)`);
        });
        generator.printOnNewline("set");
        generator.withinBlock(() => {
          generator.printOnNewline(`snapshot = newValue.snapshot`);
        });
      });
    }

    if (inlineFragments.length > 0) {
      inlineFragments.forEach(({ structName, typeCondition, selectionSet }) => {
        structDeclarationForSelectionSet(
          generator,
          {
            structName: structName,
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
          propertyDeclaration(generator, { propertyName: "snapshot", typeName: "Snapshot" });
          fragmentSpreads.forEach(({ propertyName, bareTypeName, typeName, fragment })  => {
            const isOptional = !isTypeProperSuperTypeOf(generator.context.schema, fragment.typeCondition, parentType);

            generator.printNewlineIfNeeded();
            generator.printOnNewline(`public var ${propertyName}: ${isOptional ? typeName + '?' : typeName}`);
            generator.withinBlock(() => {
              generator.printOnNewline("get");
              generator.withinBlock(() => {
                if (isOptional) {
                  generator.printOnNewline(`if !${typeName}.possibleTypes.contains(snapshot["__typename"]! as! String) { return nil }`);
                }
                generator.printOnNewline(`return ${typeName}(snapshot: snapshot)`);
              });
              generator.printOnNewline("set");
              generator.withinBlock(() => {
                if (isOptional) {
                  generator.printOnNewline(`guard let newValue = newValue else { return }`);
                  generator.printOnNewline(`snapshot = newValue.snapshot`);
                } else {
                  generator.printOnNewline(`snapshot = newValue.snapshot`);
                }
              });
            });
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

function mapExpressionForType(context, type, expression, prefix = '') {
  let isOptional;
  if (type instanceof GraphQLNonNull) {
    isOptional = false;
    type = type.ofType;
  } else {
    isOptional = true;
  }

  if (type instanceof GraphQLList) {
    if (isOptional) {
      return `${prefix}.flatMap { $0.map { ${mapExpressionForType(context, type.ofType, expression, '$0')} } }`;
    } else {
      return `${prefix}.map { ${mapExpressionForType(context, type.ofType, expression, '$0')} }`;
    }
  } else if (isOptional) {
    return `${prefix}.flatMap { ${expression} }`;
  } else {
    return expression;
  }
}

function propertyDeclarationForSelection(generator, selection) {
  const { kind, propertyName, typeName, type, isConditional, description } = selection;

  generator.printOnNewline(description && ` /// ${description}`);
  generator.printOnNewline(`public var ${propertyName}: ${typeName}`);
  generator.withinBlock(() => {
    const namedType = getNamedType(type);

    if (kind === 'InlineFragment') {
      const structName = structNameForInlineFragment(selection);

      generator.printOnNewline("get");
      generator.withinBlock(() => {
        generator.printOnNewline(`if !${structName}.possibleTypes.contains(__typename) { return nil }`);
        generator.printOnNewline(`return ${structName}(snapshot: snapshot)`);
      });
      generator.printOnNewline("set");
      generator.withinBlock(() => {
        generator.printOnNewline(`guard let newValue = newValue else { return }`);
        generator.printOnNewline(`snapshot = newValue.snapshot`);
      });
    } else if (isCompositeType(namedType)) {
      const isOptional = isConditional || !(type instanceof GraphQLNonNull);
      const isList = type instanceof GraphQLList || type.ofType instanceof GraphQLList;
      const structName = escapeIdentifierIfNeeded(structNameForPropertyName(propertyName));

      if (isList) {
        generator.printOnNewline("get");
        generator.withinBlock(() => {
          const snapshotTypeName = typeNameFromGraphQLType(generator.context, type, 'Snapshot', isOptional);
          let getter = `return (snapshot["${propertyName}"]! as! ${snapshotTypeName})`;
          getter += mapExpressionForType(generator.context, type, `${structName}(snapshot: $0)`);
          generator.printOnNewline(getter);
        });
        generator.printOnNewline("set");
        generator.withinBlock(() => {
          let newValueExpression = "newValue" + mapExpressionForType(generator.context, type, `$0.snapshot`);
          generator.printOnNewline(`snapshot.updateValue(${newValueExpression}, forKey: "${propertyName}")`);

        });
      } else {
        generator.printOnNewline("get");
        generator.withinBlock(() => {
          generator.printOnNewline(`return ${structName}(snapshot: snapshot["${propertyName}"]! as! Snapshot)`);
        });
        generator.printOnNewline("set");
        generator.withinBlock(() => {
          let newValueExpression;
          if (isOptional) {
            newValueExpression = 'newValue?.snapshot';
          } else {
            newValueExpression = 'newValue.snapshot';
          }
          generator.printOnNewline(`snapshot.updateValue(${newValueExpression}, forKey: "${propertyName}")`);
        });
      }
    } else {
      generator.printOnNewline("get");
      generator.withinBlock(() => {
        generator.printOnNewline(`return snapshot["${propertyName}"]! as! ${typeName}`);
      });
      generator.printOnNewline("set");
      generator.withinBlock(() => {
        generator.printOnNewline(`snapshot.updateValue(newValue, forKey: "${propertyName}")`);
      });
    }
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
        const { responseName, fieldName, args, type } = selection;
        const structName = join([parentStructName, structNameForPropertyName(responseName)], '.');

        generator.printOnNewline(`Field(`);
        generator.print(join([
          `"${fieldName}"`,
          responseName != fieldName ? `alias: "${responseName}"` : null,
          args && args.length && `arguments: ${dictionaryLiteralForFieldArguments(args)}`,
          `type: ${fieldTypeEnum(generator.context, type, structName)}`
        ], ', '));
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
    generator.print(join(properties.map(({ propertyName, type, typeName, isOptional }) => {
      if (isOptional) {
        return `${propertyName}: Optional<${typeName}> = nil`;
      } else {
        return `${propertyName}: ${typeName}`;
      }
    }), ', '));
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
