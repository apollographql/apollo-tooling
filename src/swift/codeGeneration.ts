import * as path from 'path';

import {
  GraphQLError,
  GraphQLType,
  getNamedType,
  isCompositeType,
  GraphQLEnumType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInputObjectType
} from 'graphql';

import { CompilerContext, Operation, Fragment, SelectionSet, Field } from '../compiler';

import { join, wrap } from '../utilities/printing';

import { SwiftGenerator, Property, escapeIdentifierIfNeeded, Struct } from './language';
import { Helpers } from './helpers';
import { isList } from '../utilities/graphql';

import { typeCaseForSelectionSet, TypeCase, Variant } from '../compiler/visitors/typeCase';
import { collectFragmentsReferenced } from '../compiler/visitors/collectFragmentsReferenced';
import { generateOperationId } from '../compiler/visitors/generateOperationId';
import { collectAndMergeFields } from '../compiler/visitors/collectAndMergeFields';

import '../utilities/array';

export interface Options {
  namespace?: string;
  passthroughCustomScalars?: boolean;
  customScalarsPrefix?: string;
}

export function generateSource(
  context: CompilerContext,
  outputIndividualFiles: boolean,
  only?: string
): SwiftAPIGenerator {
  const generator = new SwiftAPIGenerator(context);

  if (outputIndividualFiles) {
    generator.withinFile(`Types.graphql.swift`, () => {
      generator.fileHeader();

      generator.namespaceDeclaration(context.options.namespace, () => {
        context.typesUsed.forEach(type => {
          generator.typeDeclarationForGraphQLType(type);
        });
      });
    });

    const inputFilePaths = new Set<string>();

    Object.values(context.operations).forEach(operation => {
      inputFilePaths.add(operation.filePath);
    });

    Object.values(context.fragments).forEach(fragment => {
      inputFilePaths.add(fragment.filePath);
    });

    for (const inputFilePath of inputFilePaths) {
      if (only && inputFilePath !== only) continue;

      generator.withinFile(`${path.basename(inputFilePath)}.swift`, () => {
        generator.fileHeader();

        generator.namespaceExtensionDeclaration(context.options.namespace, () => {
          Object.values(context.operations).forEach(operation => {
            if (operation.filePath === inputFilePath) {
              generator.classDeclarationForOperation(operation);
            }
          });

          Object.values(context.fragments).forEach(fragment => {
            if (fragment.filePath === inputFilePath) {
              generator.structDeclarationForFragment(fragment);
            }
          });
        });
      });
    }
  } else {
    generator.fileHeader();

    generator.namespaceDeclaration(context.options.namespace, () => {
      context.typesUsed.forEach(type => {
        generator.typeDeclarationForGraphQLType(type);
      });

      Object.values(context.operations).forEach(operation => {
        generator.classDeclarationForOperation(operation);
      });

      Object.values(context.fragments).forEach(fragment => {
        generator.structDeclarationForFragment(fragment);
      });
    });
  }

  return generator;
}

export class SwiftAPIGenerator extends SwiftGenerator<CompilerContext> {
  helpers: Helpers;

  constructor(context: CompilerContext) {
    super(context);

    this.helpers = new Helpers(context.options);
  }

  fileHeader() {
    this.printOnNewline('//  This file was automatically generated and should not be edited.');
    this.printNewline();
    this.printOnNewline('import Apollo');
  }

  classDeclarationForOperation(operation: Operation) {
    const { operationName, operationType, variables, source, selectionSet } = operation;

    let className;
    let protocol;

    switch (operationType) {
      case 'query':
        className = `${this.helpers.operationClassName(operationName)}Query`;
        protocol = 'GraphQLQuery';
        break;
      case 'mutation':
        className = `${this.helpers.operationClassName(operationName)}Mutation`;
        protocol = 'GraphQLMutation';
        break;
      default:
        throw new GraphQLError(`Unsupported operation type "${operationType}"`);
    }

    this.classDeclaration(
      {
        className,
        modifiers: ['public', 'final'],
        adoptedProtocols: [protocol]
      },
      () => {
        if (source) {
          this.printOnNewline('public static let operationString =');
          this.withIndent(() => {
            this.multilineString(source);
          });
        }

        const fragmentsReferenced = collectFragmentsReferenced(
          operation.selectionSet,
          this.context.fragments
        );

        if (this.context.options.generateOperationIds) {
          const { operationId } = generateOperationId(operation, this.context.fragments, fragmentsReferenced);
          this.printNewlineIfNeeded();
          this.printOnNewline(`public static let operationIdentifier: String? = "${operationId}"`);
        }

        if (fragmentsReferenced.size > 0) {
          this.printNewlineIfNeeded();
          this.printOnNewline('public static var requestString: String { return operationString');
          fragmentsReferenced.forEach(fragmentName => {
            this.print(`.appending(${this.helpers.structNameForFragmentName(fragmentName)}.fragmentString)`);
          });
          this.print(' }');
        }

        this.printNewlineIfNeeded();

        if (variables && variables.length > 0) {
          const properties = variables.map(({ name, type }) => {
            const typeName = this.helpers.typeNameFromGraphQLType(type);
            const isOptional = !(
              type instanceof GraphQLNonNull ||
              (type instanceof GraphQLList && type.ofType instanceof GraphQLNonNull)
            );
            return { name, propertyName: name, type, typeName, isOptional };
          });

          this.propertyDeclarations(properties);

          this.printNewlineIfNeeded();
          this.initializerDeclarationForProperties(properties);

          this.printNewlineIfNeeded();
          this.printOnNewline(`public var variables: GraphQLMap?`);
          this.withinBlock(() => {
            this.printOnNewline(
              wrap(
                `return [`,
                join(properties.map(({ name, propertyName }) => `"${name}": ${propertyName}`), ', ') || ':',
                `]`
              )
            );
          });
        } else {
          this.initializerDeclarationForProperties([]);
        }

        this.structDeclarationForSelectionSet({
          structName: 'Data',
          selectionSet
        });
      }
    );
  }

  structDeclarationForFragment({ fragmentName, selectionSet, source }: Fragment) {
    const structName = this.helpers.structNameForFragmentName(fragmentName);

    this.structDeclarationForSelectionSet(
      {
        structName,
        adoptedProtocols: ['GraphQLFragment'],
        selectionSet
      },
      () => {
        if (source) {
          this.printOnNewline('public static let fragmentString =');
          this.withIndent(() => {
            this.multilineString(source);
          });
        }
      }
    );
  }

  structDeclarationForSelectionSet(
    {
      structName,
      adoptedProtocols = ['GraphQLSelectionSet'],
      selectionSet
    }: {
      structName: string;
      adoptedProtocols?: string[];
      selectionSet: SelectionSet;
    },
    before?: Function
  ) {
    const typeCase = typeCaseForSelectionSet(
      selectionSet,
      this.context.options.mergeInFieldsFromFragmentSpreads
    );

    this.structDeclarationForVariant(
      {
        structName,
        adoptedProtocols,
        variant: typeCase.default,
        typeCase
      },
      before,
      () => {
        const variants = typeCase.variants.map(this.helpers.propertyFromVariant, this.helpers);

        for (const variant of variants) {
          this.propertyDeclarationForVariant(variant);

          this.structDeclarationForVariant({
            structName: variant.structName,
            variant
          });
        }
      }
    );
  }

  structDeclarationForVariant(
    {
      structName,
      adoptedProtocols = ['GraphQLSelectionSet'],
      variant,
      typeCase
    }: {
      structName: string;
      adoptedProtocols?: string[];
      variant: Variant;
      typeCase?: TypeCase;
    },
    before?: Function,
    after?: Function
  ) {
    this.structDeclaration({ structName, adoptedProtocols }, () => {
      if (before) {
        before();
      }

      this.printNewlineIfNeeded();
      this.printOnNewline('public static let possibleTypes = [');
      this.print(join(variant.possibleTypes.map(type => `"${type.name}"`), ', '));
      this.print(']');

      this.printNewlineIfNeeded();
      this.printOnNewline('public static let selections: [GraphQLSelection] = ');
      if (typeCase) {
        this.typeCaseInitialization(typeCase);
      } else {
        this.selectionSetInitialization(variant);
      }

      this.printNewlineIfNeeded();

      this.propertyDeclaration({
        propertyName: 'snapshot',
        typeName: 'Snapshot'
      });

      this.printNewlineIfNeeded();
      this.printOnNewline('public init(snapshot: Snapshot)');
      this.withinBlock(() => {
        this.printOnNewline(`self.snapshot = snapshot`);
      });

      if (typeCase) {
        this.initializersForTypeCase(typeCase);
      } else {
        this.initializersForVariant(variant);
      }

      const fields = collectAndMergeFields(
        variant,
        this.context.options.mergeInFieldsFromFragmentSpreads
      ).map(field => this.helpers.propertyFromField(field as Field));

      const fragmentSpreads = variant.fragmentSpreads.map(fragmentSpread => {
        const isConditional = variant.possibleTypes.some(
          type => !fragmentSpread.selectionSet.possibleTypes.includes(type)
        );

        return this.helpers.propertyFromFragmentSpread(fragmentSpread, isConditional);
      });

      fields.forEach(this.propertyDeclarationForField, this);

      if (fragmentSpreads.length > 0) {
        this.printNewlineIfNeeded();
        this.printOnNewline(`public var fragments: Fragments`);
        this.withinBlock(() => {
          this.printOnNewline('get');
          this.withinBlock(() => {
            this.printOnNewline(`return Fragments(snapshot: snapshot)`);
          });
          this.printOnNewline('set');
          this.withinBlock(() => {
            this.printOnNewline(`snapshot += newValue.snapshot`);
          });
        });

        this.structDeclaration(
          {
            structName: 'Fragments'
          },
          () => {
            this.propertyDeclaration({
              propertyName: 'snapshot',
              typeName: 'Snapshot'
            });

            for (const fragmentSpread of fragmentSpreads) {
              const { propertyName, typeName, structName, isConditional } = fragmentSpread;

              this.printNewlineIfNeeded();
              this.printOnNewline(`public var ${escapeIdentifierIfNeeded(propertyName)}: ${typeName}`);
              this.withinBlock(() => {
                this.printOnNewline('get');
                this.withinBlock(() => {
                  if (isConditional) {
                    this.printOnNewline(
                      `if !${structName}.possibleTypes.contains(snapshot["__typename"]! as! String) { return nil }`
                    );
                  }
                  this.printOnNewline(`return ${structName}(snapshot: snapshot)`);
                });
                this.printOnNewline('set');
                this.withinBlock(() => {
                  if (isConditional) {
                    this.printOnNewline(`guard let newValue = newValue else { return }`);
                    this.printOnNewline(`snapshot += newValue.snapshot`);
                  } else {
                    this.printOnNewline(`snapshot += newValue.snapshot`);
                  }
                });
              });
            }
          }
        );
      }

      for (const field of fields) {
        if (isCompositeType(getNamedType(field.type)) && field.selectionSet) {
          this.structDeclarationForSelectionSet({
            structName: field.structName,
            selectionSet: field.selectionSet
          });
        }
      }

      if (after) {
        after();
      }
    });
  }

  initializersForTypeCase(typeCase: TypeCase) {
    const variants = typeCase.variants;

    if (variants.length == 0) {
      this.initializersForVariant(typeCase.default);
    } else {
      const remainder = typeCase.remainder;
      for (const variant of remainder ? [remainder, ...variants] : variants) {
        this.initializersForVariant(
          variant,
          variant === remainder ? undefined : this.helpers.structNameForVariant(variant),
          false
        );
      }
    }
  }

  initializersForVariant(variant: Variant, namespace?: string, useInitializerIfPossible: boolean = true) {
    if (useInitializerIfPossible && variant.possibleTypes.length == 1) {
      const properties = this.helpers.propertiesForSelectionSet(variant);
      if (!properties) return;

      this.printNewlineIfNeeded();
      this.printOnNewline(`public init`);

      this.parametersForProperties(properties);

      this.withinBlock(() => {
        this.printOnNewline(
          wrap(
            `self.init(snapshot: [`,
            join(
              [
                `"__typename": "${variant.possibleTypes[0]}"`,
                ...properties.map(this.propertyAssignmentForField, this)
              ],
              ', '
            ) || ':',
            `])`
          )
        );
      });
    } else {
      const structName = this.scope.typeName;

      for (const possibleType of variant.possibleTypes) {
        const properties = this.helpers.propertiesForSelectionSet(
          {
            possibleTypes: [possibleType],
            selections: variant.selections
          },
          namespace
        );

        if (!properties) continue;

        this.printNewlineIfNeeded();
        this.printOnNewline(`public static func make${possibleType}`);

        this.parametersForProperties(properties);

        this.print(` -> ${structName}`);

        this.withinBlock(() => {
          this.printOnNewline(
            wrap(
              `return ${structName}(snapshot: [`,
              join(
                [`"__typename": "${possibleType}"`, ...properties.map(this.propertyAssignmentForField, this)],
                ', '
              ) || ':',
              `])`
            )
          );
        });
      }
    }
  }

  propertyAssignmentForField(field: { responseKey: string; propertyName: string; type: GraphQLType }) {
    const { responseKey, propertyName, type } = field;
    const valueExpression = isCompositeType(getNamedType(type))
      ? this.helpers.mapExpressionForType(
          type,
          identifier => `${identifier}.snapshot`,
          escapeIdentifierIfNeeded(propertyName)
        )
      : escapeIdentifierIfNeeded(propertyName);
    return `"${responseKey}": ${valueExpression}`;
  }

  propertyDeclarationForField(field: Field & Property) {
    const { responseKey, propertyName, typeName, type, isOptional } = field;

    const unmodifiedFieldType = getNamedType(type);

    this.printNewlineIfNeeded();

    this.comment(field.description);
    this.deprecationAttributes(field.isDeprecated, field.deprecationReason);

    this.printOnNewline(`public var ${propertyName}: ${typeName}`);
    this.withinBlock(() => {
      if (isCompositeType(unmodifiedFieldType)) {
        const structName = escapeIdentifierIfNeeded(this.helpers.structNameForPropertyName(propertyName));

        if (isList(type)) {
          this.printOnNewline('get');
          this.withinBlock(() => {
            const snapshotTypeName = this.helpers.typeNameFromGraphQLType(type, 'Snapshot', false);
            let getter;
            if (isOptional) {
              getter = `return (snapshot["${responseKey}"] as? ${snapshotTypeName})`;
            } else {
              getter = `return (snapshot["${responseKey}"] as! ${snapshotTypeName})`;
            }
            getter += this.helpers.mapExpressionForType(
              type,
              identifier => `${structName}(snapshot: ${identifier})`
            );
            this.printOnNewline(getter);
          });
          this.printOnNewline('set');
          this.withinBlock(() => {
            let newValueExpression = this.helpers.mapExpressionForType(
              type,
              identifier => `${identifier}.snapshot`,
              'newValue'
            );
            this.printOnNewline(`snapshot.updateValue(${newValueExpression}, forKey: "${responseKey}")`);
          });
        } else {
          this.printOnNewline('get');
          this.withinBlock(() => {
            if (isOptional) {
              this.printOnNewline(
                `return (snapshot["${responseKey}"] as? Snapshot).flatMap { ${structName}(snapshot: $0) }`
              );
            } else {
              this.printOnNewline(`return ${structName}(snapshot: snapshot["${responseKey}"]! as! Snapshot)`);
            }
          });
          this.printOnNewline('set');
          this.withinBlock(() => {
            let newValueExpression;
            if (isOptional) {
              newValueExpression = 'newValue?.snapshot';
            } else {
              newValueExpression = 'newValue.snapshot';
            }
            this.printOnNewline(`snapshot.updateValue(${newValueExpression}, forKey: "${responseKey}")`);
          });
        }
      } else {
        this.printOnNewline('get');
        this.withinBlock(() => {
          if (isOptional) {
            this.printOnNewline(`return snapshot["${responseKey}"] as? ${typeName.slice(0, -1)}`);
          } else {
            this.printOnNewline(`return snapshot["${responseKey}"]! as! ${typeName}`);
          }
        });
        this.printOnNewline('set');
        this.withinBlock(() => {
          this.printOnNewline(`snapshot.updateValue(newValue, forKey: "${responseKey}")`);
        });
      }
    });
  }

  propertyDeclarationForVariant(variant: Property & Struct) {
    const { propertyName, typeName, structName } = variant;

    this.printNewlineIfNeeded();
    this.printOnNewline(`public var ${propertyName}: ${typeName}`);
    this.withinBlock(() => {
      this.printOnNewline('get');
      this.withinBlock(() => {
        this.printOnNewline(`if !${structName}.possibleTypes.contains(__typename) { return nil }`);
        this.printOnNewline(`return ${structName}(snapshot: snapshot)`);
      });
      this.printOnNewline('set');
      this.withinBlock(() => {
        this.printOnNewline(`guard let newValue = newValue else { return }`);
        this.printOnNewline(`snapshot = newValue.snapshot`);
      });
    });
  }

  initializerDeclarationForProperties(properties: Property[]) {
    this.printOnNewline(`public init`);
    this.parametersForProperties(properties);

    this.withinBlock(() => {
      properties.forEach(({ propertyName }) => {
        this.printOnNewline(`self.${propertyName} = ${propertyName}`);
      });
    });
  }

  parametersForProperties(properties: Property[]) {
    this.print('(');
    this.print(
      join(
        properties.map(({ propertyName, typeName, isOptional }) =>
          join([`${escapeIdentifierIfNeeded(propertyName)}: ${typeName}`, isOptional && ' = nil'])
        ),
        ', '
      )
    );
    this.print(')');
  }

  typeCaseInitialization(typeCase: TypeCase) {
    if (typeCase.variants.length < 1) {
      this.selectionSetInitialization(typeCase.default);
      return;
    }

    this.print('[');
    this.withIndent(() => {
      this.printOnNewline(`GraphQLTypeCase(`);
      this.withIndent(() => {
        this.printOnNewline(`variants: [`);
        this.print(
          typeCase.variants
            .flatMap(variant => {
              const structName = this.helpers.structNameForVariant(variant);
              return variant.possibleTypes.map(type => `"${type}": ${structName}.selections`);
            })
            .join(', ')
        );
        this.print('],');
        this.printOnNewline(`default: `);
        this.selectionSetInitialization(typeCase.default);
      });
      this.printOnNewline(')');
    });
    this.printOnNewline(']');
  }

  selectionSetInitialization(selectionSet: SelectionSet) {
    this.print('[');
    this.withIndent(() => {
      for (const selection of selectionSet.selections) {
        switch (selection.kind) {
          case 'Field': {
            const { name, alias, args, type } = selection;
            const responseKey = selection.alias || selection.name;
            const structName = this.helpers.structNameForPropertyName(responseKey);

            this.printOnNewline(`GraphQLField(`);
            this.print(
              join(
                [
                  `"${name}"`,
                  alias ? `alias: "${alias}"` : null,
                  args &&
                    args.length &&
                    `arguments: ${this.helpers.dictionaryLiteralForFieldArguments(args)}`,
                  `type: ${this.helpers.fieldTypeEnum(type, structName)}`
                ],
                ', '
              )
            );
            this.print('),');
            break;
          }
          case 'BooleanCondition':
            this.printOnNewline(`GraphQLBooleanCondition(`);
            this.print(
              join(
                [
                  `variableName: "${selection.variableName}"`,
                  `inverted: ${selection.inverted}`,
                  'selections: '
                ],
                ', '
              )
            );
            this.selectionSetInitialization(selection.selectionSet);
            this.print('),');
            break;
          case 'TypeCondition': {
            this.printOnNewline(`GraphQLTypeCondition(`);
            this.print(
              join(
                [
                  `possibleTypes: [${join(
                    selection.selectionSet.possibleTypes.map(type => `"${type.name}"`),
                    ', '
                  )}]`,
                  'selections: '
                ],
                ', '
              )
            );
            this.selectionSetInitialization(selection.selectionSet);
            this.print('),');
            break;
          }
          case 'FragmentSpread': {
            const structName = this.helpers.structNameForFragmentName(selection.fragmentName);
            this.printOnNewline(`GraphQLFragmentSpread(${structName}.self),`);
            break;
          }
        }
      }
    });
    this.printOnNewline(']');
  }

  typeDeclarationForGraphQLType(type: GraphQLType) {
    if (type instanceof GraphQLEnumType) {
      this.enumerationDeclaration(type);
    } else if (type instanceof GraphQLInputObjectType) {
      this.structDeclarationForInputObjectType(type);
    }
  }

  enumerationDeclaration(type: GraphQLEnumType) {
    const { name, description } = type;
    const values = type.getValues();

    this.printNewlineIfNeeded();
    this.comment(description);
    this.printOnNewline(`public enum ${name}: String`);
    this.withinBlock(() => {
      values.forEach(value => {
        this.comment(value.description);
        this.deprecationAttributes(value.isDeprecated, value.deprecationReason);
        this.printOnNewline(
          `case ${escapeIdentifierIfNeeded(this.helpers.enumCaseName(value.name))} = "${value.value}"`
        );
      });
    });
    this.printNewline();
    this.printOnNewline(`extension ${name}: Apollo.JSONDecodable, Apollo.JSONEncodable {}`);
  }

  structDeclarationForInputObjectType(type: GraphQLInputObjectType) {
    const { name: structName, description } = type;
    const adoptedProtocols = ['GraphQLMapConvertible'];
    const fields = Object.values(type.getFields());

    const properties = fields.map(this.helpers.propertyFromInputField, this.helpers);

    properties.forEach(property => {
      if (property.isOptional) {
        property.typeName = `Optional<${property.typeName}>`;
      }
    });

    this.structDeclaration({ structName, description, adoptedProtocols }, () => {
      this.printOnNewline(`public var graphQLMap: GraphQLMap`);

      this.printNewlineIfNeeded();
      this.printOnNewline(`public init`);
      this.print('(');
      this.print(
        join(
          properties.map(({ propertyName, typeName, isOptional }) =>
            join([`${propertyName}: ${typeName}`, isOptional && ' = nil'])
          ),
          ', '
        )
      );
      this.print(')');

      this.withinBlock(() => {
        this.printOnNewline(
          wrap(
            `graphQLMap = [`,
            join(properties.map(({ name, propertyName }) => `"${name}": ${propertyName}`), ', ') || ':',
            `]`
          )
        );
      });

      for (const { propertyName, typeName, description } of properties) {
        this.printNewlineIfNeeded();
        this.comment(description);
        this.printOnNewline(`public var ${propertyName}: ${typeName}`);
        this.withinBlock(() => {
          this.printOnNewline('get');
          this.withinBlock(() => {
            this.printOnNewline(`return graphQLMap["${propertyName}"] as! ${typeName}`);
          });
          this.printOnNewline('set');
          this.withinBlock(() => {
            this.printOnNewline(`graphQLMap.updateValue(newValue, forKey: "${propertyName}")`);
          });
        });
      }
    });
  }
}
