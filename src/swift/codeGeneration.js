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
  escapeIdentifierIfNeeded,
  comment
} from './language';

import {
  structNameForPropertyName,
  structNameForFragmentName,
  structNameForInlineFragment,
  operationClassName,
  enumCaseName,
  propertiesFromSelectionSet,
  propertyFromField,
  propertyFromInlineFragment,
  propertyFromFragmentSpread
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

export function generateSource(context, options) {
  const generator = new CodeGenerator(context);

  generator.printOnNewline('//  This file was automatically generated and should not be edited.');
  generator.printNewline();
  generator.printOnNewline('import Apollo');

  namespaceDeclaration(generator, context.namespace, () => {

    context.typesUsed.forEach(type => {
      typeDeclarationForGraphQLType(generator, type);
    });

    Object.values(context.operations).forEach(operation => {
      classDeclarationForOperation(generator, operation);
    });

    Object.values(context.fragments).forEach(fragment => {
      structDeclarationForFragment(generator, fragment);
    });
  })

  return generator.output;
}

export function classDeclarationForOperation(
  generator,
  {
    operationName,
    operationType,
    rootType,
    variables,
    fields,
    inlineFragments,
    fragmentSpreads,
    fragmentsReferenced,
    source,
    sourceWithFragments,
    operationId
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

    operationIdentifier(generator, { operationName, sourceWithFragments, operationId });

    if (fragmentsReferenced && fragmentsReferenced.length > 0) {
      generator.printNewlineIfNeeded();
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
        fields,
        inlineFragments,
        fragmentSpreads
      }
    );
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
  const structName = structNameForFragmentName(fragmentName);

  structDeclarationForSelectionSet(generator, {
    structName,
    adoptedProtocols: ['GraphQLFragment'],
    parentType: typeCondition,
    fields,
    inlineFragments,
    fragmentSpreads
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
    fields,
    inlineFragments,
    fragmentSpreads,
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
    selectionSetInitialization(generator, fields, inlineFragments, structName);

    generator.printNewlineIfNeeded();

    propertyDeclaration(generator, { propertyName: "snapshot", typeName: "Snapshot" });

    generator.printNewlineIfNeeded();
    generator.printOnNewline('public init(snapshot: Snapshot)');
    generator.withinBlock(() => {
      generator.printOnNewline(`self.snapshot = snapshot`);
    });

    if (!possibleTypes || possibleTypes.length == 1) {
      generator.printNewlineIfNeeded();
      generator.printOnNewline(`public init`);

      const properties = fields
        .map(field => propertyFromField(generator.context, field))
        .filter(field => field.propertyName != "__typename");

      parametersForProperties(generator, properties);

      generator.withinBlock(() => {
        generator.printOnNewline(wrap(
          `self.init(snapshot: [`,
          join([
            `"__typename": "${possibleTypes[0]}"`,
            ...properties.map(({ propertyName }) => `"${propertyName}": ${propertyName}`)
          ], ', ') || ':',
          `])`
        ));
      });
    } else {
      possibleTypes.forEach(possibleType => {
        generator.printNewlineIfNeeded();
        generator.printOnNewline(`public static func make${possibleType}`);

        const inlineFragment = inlineFragments && inlineFragments.find(inlineFragment => inlineFragment.typeCondition === possibleType);
        const fieldsForPossibleType = inlineFragment ? inlineFragment.fields : fields;

        const properties = fieldsForPossibleType
          .map(field => propertyFromField(generator.context, field, inlineFragment && structNameForInlineFragment(inlineFragment)))
          .filter(field => field.propertyName != "__typename");

        parametersForProperties(generator, properties);

        generator.print(` -> ${structName}`);

        generator.withinBlock(() => {
          generator.printOnNewline(wrap(
            `return ${structName}(snapshot: [`,
            join([
              `"__typename": "${possibleType}"`,
              ...properties.map(({ propertyName }) => `"${propertyName}": ${propertyName}`)
            ], ', ') || ':',
            `])`
          ));
        });
      });
    }

    fields.forEach(field => propertyDeclarationForField(generator, field));
    inlineFragments && inlineFragments.forEach(inlineFragment => propertyDeclarationForInlineFragment(generator, inlineFragment));

    if (fragmentSpreads && fragmentSpreads.length > 0) {
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

    if (inlineFragments && inlineFragments.length > 0) {
      inlineFragments.forEach((inlineFragment) => {
        structDeclarationForSelectionSet(
          generator,
          {
            structName: structNameForInlineFragment(inlineFragment),
            parentType: inlineFragment.typeCondition,
            adoptedProtocols: ['GraphQLFragment'],
            fields: inlineFragment.fields,
            inlineFragments: inlineFragment.inlineFragments,
            fragmentSpreads: inlineFragment.fragmentSpreads
          }
        );
      });
    }

    if (fragmentSpreads && fragmentSpreads.length > 0) {
      structDeclaration(
        generator,
        {
          structName: 'Fragments'
        },
        () => {
          propertyDeclaration(generator, { propertyName: "snapshot", typeName: "Snapshot" });
          fragmentSpreads.forEach(fragmentSpread  => {
            const { propertyName, bareTypeName, typeName, fragment } = propertyFromFragmentSpread(generator.context, fragmentSpread);
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
          fields: field.fields,
          inlineFragments: field.inlineFragments,
          fragmentSpreads: field.fragmentSpreads
        }
      );
    });
  });
}

function operationIdentifier(generator,  { operationName, sourceWithFragments, operationId }) {
  if (!generator.context.generateOperationIds) {
    return
  }

  generator.printNewlineIfNeeded();
  generator.printOnNewline(`public static let operationIdentifier = "${operationId}"`);
}

function propertyDeclarationForField(generator, field) {
  const { kind, propertyName, typeName, type, isConditional, description } = propertyFromField(generator.context, field);
  const responseName = field.responseName;
  const namedType = getNamedType(type);

  generator.printNewlineIfNeeded();
  comment(generator, description);
  generator.printOnNewline(`public var ${propertyName}: ${typeName}`);
  generator.withinBlock(() => {
    if (isCompositeType(namedType)) {
      const isOptional = isConditional || !(type instanceof GraphQLNonNull);
      const isList = type instanceof GraphQLList || type.ofType instanceof GraphQLList;
      const structName = escapeIdentifierIfNeeded(structNameForPropertyName(propertyName));

      if (isList) {
        generator.printOnNewline("get");
        generator.withinBlock(() => {
          const snapshotTypeName = typeNameFromGraphQLType(generator.context, type, 'Snapshot', isOptional);
          let getter = `return (snapshot["${responseName}"]! as! ${snapshotTypeName})`;
          getter += mapExpressionForType(generator.context, type, `${structName}(snapshot: $0)`);
          generator.printOnNewline(getter);
        });
        generator.printOnNewline("set");
        generator.withinBlock(() => {
          let newValueExpression = "newValue" + mapExpressionForType(generator.context, type, `$0.snapshot`);
          generator.printOnNewline(`snapshot.updateValue(${newValueExpression}, forKey: "${responseName}")`);

        });
      } else {
        generator.printOnNewline("get");
        generator.withinBlock(() => {
          if (isOptional) {
            generator.printOnNewline(`return (snapshot["${responseName}"]! as! Snapshot?).flatMap { ${structName}(snapshot: $0) }`);
          } else {
            generator.printOnNewline(`return ${structName}(snapshot: snapshot["${responseName}"]! as! Snapshot)`);
          }
        });
        generator.printOnNewline("set");
        generator.withinBlock(() => {
          let newValueExpression;
          if (isOptional) {
            newValueExpression = 'newValue?.snapshot';
          } else {
            newValueExpression = 'newValue.snapshot';
          }
          generator.printOnNewline(`snapshot.updateValue(${newValueExpression}, forKey: "${responseName}")`);
        });
      }
    } else {
      generator.printOnNewline("get");
      generator.withinBlock(() => {
        generator.printOnNewline(`return snapshot["${responseName}"]! as! ${typeName}`);
      });
      generator.printOnNewline("set");
      generator.withinBlock(() => {
        generator.printOnNewline(`snapshot.updateValue(newValue, forKey: "${responseName}")`);
      });
    }
  });
}

function propertyDeclarationForInlineFragment(generator, inlineFragment) {
  const { kind, propertyName, typeName, type, isConditional, description } = propertyFromInlineFragment(generator.context, inlineFragment);
  const namedType = getNamedType(type);

  generator.printNewlineIfNeeded();
  comment(generator, description);
  generator.printOnNewline(`public var ${propertyName}: ${typeName}`);
  generator.withinBlock(() => {
    const structName = structNameForInlineFragment(inlineFragment);

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

export function initializerDeclarationForProperties(generator, properties) {
  generator.printOnNewline(`public init`);
  parametersForProperties(generator, properties);

  generator.withinBlock(() => {
    properties.forEach(({ propertyName }) => {
      generator.printOnNewline(`self.${propertyName} = ${propertyName}`);
    });
  });
}

function parametersForProperties(generator, properties) {
  generator.print('(');
  generator.print(join(properties.map(({ propertyName, type, typeName, isOptional }) =>
    join([
      `${propertyName}: ${typeName}`,
      isOptional && ' = nil'
    ])
  ), ', '));
  generator.print(')');
}

export function selectionSetInitialization(generator, fields, inlineFragments, parentStructName) {
  generator.print('[');
  generator.withIndent(() => {
    fields.forEach(field => {
      const { responseName, fieldName, args, type } = field;
      const structName = join([parentStructName, structNameForPropertyName(responseName)], '.');

      generator.printOnNewline(`Field(`);
      generator.print(join([
        `"${fieldName}"`,
        responseName != fieldName ? `alias: "${responseName}"` : null,
        args && args.length && `arguments: ${dictionaryLiteralForFieldArguments(args)}`,
        `type: ${fieldTypeEnum(generator.context, type, structName)}`
      ], ', '));
      generator.print('),');
    });

    inlineFragments && inlineFragments.forEach(InlineFragment => {
      const structName = join([parentStructName, structNameForInlineFragment(InlineFragment)], '.');
      generator.printOnNewline(`FragmentSpread(${structName}.self),`);
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
  generator.printOnNewline(`extension ${name}: Apollo.JSONDecodable, Apollo.JSONEncodable {}`);
}

function structDeclarationForInputObjectType(generator, type) {
  const { name: structName, description } = type;
  const adoptedProtocols = ['GraphQLMapConvertible'];
  const fields = Object.values(type.getFields());
  const properties = fields.map(field => propertyFromField(generator.context, field));

  properties.forEach(property => {
    if (property.isOptional) {
      property.typeName = `Optional<${property.typeName}>`;
    }
  });

  structDeclaration(generator, { structName, description, adoptedProtocols }, () => {
    propertyDeclarations(generator, properties);

    generator.printNewlineIfNeeded();

    initializerDeclarationForProperties(generator, properties);

    generator.printNewlineIfNeeded();
    generator.printOnNewline(`public var graphQLMap: GraphQLMap`);
    generator.withinBlock(() => {
      generator.printOnNewline(wrap(
        `return [`,
        join(properties.map(({ name, propertyName }) => `"${name}": ${propertyName}`), ', ') || ':',
        `]`,
      ));
    });
  });
}
