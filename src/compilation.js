import {
  print,
  visit,
  visitWithTypeInfo,
  typeFromAST,
  getNamedType,
  isAbstractType,
  isEqualType,
  isTypeSubTypeOf,
  doTypesOverlap,
  Kind,
  TypeInfo,
  isType,
  isCompositeType,
  GraphQLScalarType,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
  GraphQLError
} from 'graphql';

import {
  isTypeProperSuperTypeOf,
  getOperationRootType,
  getFieldDef,
  valueFromValueNode,
  filePathForNode,
  sourceAt,
  withTypenameFieldAddedWhereNeeded,
  isBuiltInScalarType
} from './utilities/graphql';

import {
  join,
  block,
  wrap,
  indent
} from './utilities/printing';

import { 
  flatMap, 
  uniqBy 
} from 'lodash';

import * as sjcl from 'sjcl';

// Parts of this code are adapted from graphql-js

export function compileToIR(schema, document, options = { mergeInFieldsFromFragmentSpreads: true }) {
  if (options.addTypename) {
    document = withTypenameFieldAddedWhereNeeded(schema, document);
  }

  const compiler = new Compiler(schema, document, options);

  const operations = Object.create(null);

  compiler.operations.forEach(operation => {
    operations[operation.name.value] = compiler.compileOperation(operation)
  });

  const fragments = Object.create(null);

  compiler.fragments.forEach(fragment => {
    fragments[fragment.name.value] = compiler.compileFragment(fragment)
  });

  Object.values(operations).forEach(operation => {
    augmentCompiledOperationWithFragments(operation, fragments)
  });

  const typesUsed = compiler.typesUsed;

  return { schema, operations, fragments, typesUsed };
}

export class Compiler {
  constructor(schema, document, options) {
    this.schema = schema;
    this.options = options;

    this.typesUsedSet = new Set();

    this.fragmentMap = Object.create(null);
    this.operations = [];

    for (const definition of document.definitions) {
      switch (definition.kind) {
        case Kind.OPERATION_DEFINITION:
          this.operations.push(definition);
          break;
        case Kind.FRAGMENT_DEFINITION:
          this.fragmentMap[definition.name.value] = definition;
          break;
      }
    }

    this.compiledFragmentMap = Object.create(null);
  }

  addTypeUsed(type) {
    if (this.typesUsedSet.has(type)) return;

    if (type instanceof GraphQLEnumType ||
        type instanceof GraphQLInputObjectType ||
        (type instanceof GraphQLScalarType && !isBuiltInScalarType(type))) {
      this.typesUsedSet.add(type);
    }
    if (type instanceof GraphQLInputObjectType) {
      for (const field of Object.values(type.getFields())) {
        this.addTypeUsed(getNamedType(field.type));
      }
    }
  }

  get typesUsed() {
    return Array.from(this.typesUsedSet);
  }

  fragmentNamed(fragmentName) {
    return this.fragmentMap[fragmentName];
  }

  get fragments() {
    return Object.values(this.fragmentMap);
  }

  compileOperation(operationDefinition) {
    const filePath = filePathForNode(operationDefinition);
    const operationName = operationDefinition.name.value;
    const operationType = operationDefinition.operation;

    const variables = operationDefinition.variableDefinitions.map(node => {
      const name = node.variable.name.value;
      const type = typeFromAST(this.schema, node.type);
      this.addTypeUsed(getNamedType(type));
      return { name, type };
    });

    const source = print(operationDefinition);
    const rootType = getOperationRootType(this.schema, operationDefinition);

    const groupedVisitedFragmentSet = new Map();
    const groupedFieldSet = this.collectFields(rootType, operationDefinition.selectionSet, undefined, groupedVisitedFragmentSet);

    const fragmentsReferencedSet = Object.create(null);
    const { fields } = this.resolveFields(rootType, groupedFieldSet, groupedVisitedFragmentSet, fragmentsReferencedSet);
    const fragmentsReferenced = Object.keys(fragmentsReferencedSet);

    return { filePath, operationName, operationType, rootType, variables, source, fields, fragmentsReferenced };
  }

  compileFragment(fragmentDefinition) {
    const filePath = filePathForNode(fragmentDefinition);
    const fragmentName = fragmentDefinition.name.value;

    const source = print(fragmentDefinition);

    const typeCondition = typeFromAST(this.schema, fragmentDefinition.typeCondition);
    const possibleTypes = this.possibleTypesForType(typeCondition)

    const groupedVisitedFragmentSet = new Map();
    const groupedFieldSet = this.collectFields(typeCondition, fragmentDefinition.selectionSet, undefined, groupedVisitedFragmentSet);

    const fragmentsReferencedSet = Object.create(null);
    const { fields, fragmentSpreads, inlineFragments } = this.resolveFields(typeCondition, groupedFieldSet, groupedVisitedFragmentSet, fragmentsReferencedSet);
    const fragmentsReferenced = Object.keys(fragmentsReferencedSet);

    return { filePath, fragmentName, source, typeCondition, possibleTypes, fields, fragmentSpreads, inlineFragments, fragmentsReferenced };
  }

  collectFields(parentType, selectionSet, groupedFieldSet = Object.create(null), groupedVisitedFragmentSet = new Map()) {
    if (!isCompositeType(parentType)) {
      throw new Error(`parentType should be a composite type, but is "${String(parentType)}"`);
    }

    for (const selection of selectionSet.selections) {
      switch (selection.kind) {
        case Kind.FIELD: {
          const fieldName = selection.name.value;
          const responseName = selection.alias ? selection.alias.value : fieldName;

          const field = getFieldDef(this.schema, parentType, selection);
          if (!field) {
            throw new GraphQLError(`Cannot query field "${fieldName}" on type "${String(parentType)}"`, [selection]);
          }

          if (groupedFieldSet) {
            if (!groupedFieldSet[responseName]) {
              groupedFieldSet[responseName] = [];
            }

            groupedFieldSet[responseName].push([parentType, {
              responseName,
              fieldName,
              args: argumentsFromAST(selection.arguments),
              type: field.type,
              directives: selection.directives,
              selectionSet: selection.selectionSet
            }]);
          }
          break;
        }
        case Kind.INLINE_FRAGMENT: {
          const typeCondition = selection.typeCondition;
          const inlineFragmentType = typeCondition ?
            typeFromAST(this.schema, typeCondition) :
            parentType;

          if (!doTypesOverlap(this.schema, inlineFragmentType, parentType)) continue;
          const effectiveType = parentType instanceof GraphQLObjectType ? parentType : inlineFragmentType;

          this.collectFields(
            effectiveType,
            selection.selectionSet,
            groupedFieldSet,
            groupedVisitedFragmentSet
          );
          break;
        }
        case Kind.FRAGMENT_SPREAD: {
          const fragmentName = selection.name.value;

          const fragment = this.fragmentNamed(fragmentName);
          if (!fragment) throw new GraphQLError(`Cannot find fragment "${fragmentName}"`);

          const typeCondition = fragment.typeCondition;
          const fragmentType = typeFromAST(this.schema, typeCondition)

          if (groupedVisitedFragmentSet) {
            let visitedFragmentSet = groupedVisitedFragmentSet.get(parentType);
            if (!visitedFragmentSet) {
              visitedFragmentSet = {};
              groupedVisitedFragmentSet.set(parentType, visitedFragmentSet);
            }

            if (visitedFragmentSet[fragmentName]) continue;
            visitedFragmentSet[fragmentName] = true;
          }

          if (!doTypesOverlap(this.schema, fragmentType, parentType)) continue;
          const effectiveType = parentType instanceof GraphQLObjectType ? parentType : fragmentType;

          this.collectFields(
            effectiveType,
            fragment.selectionSet,
            this.options.mergeInFieldsFromFragmentSpreads ? groupedFieldSet : null,
            groupedVisitedFragmentSet
          );
          break;
        }
      }
    }

    return groupedFieldSet;
  }

  possibleTypesForType(type) {
    if (isAbstractType(type)) {
      return this.schema.getPossibleTypes(type);
    } else {
      return [type];
    }
  }

  mergeSelectionSets(parentType, fieldSet, groupedVisitedFragmentSet) {
    const groupedFieldSet = Object.create(null);

    for (const [,field] of fieldSet) {
      const selectionSet = field.selectionSet;

      if (selectionSet) {
        this.collectFields(parentType, selectionSet, groupedFieldSet, groupedVisitedFragmentSet);
      }
    }

    return groupedFieldSet;
  }

  resolveFields(parentType, groupedFieldSet, groupedVisitedFragmentSet, fragmentsReferencedSet) {
    const fields = [];

    for (let [responseName, fieldSet] of Object.entries(groupedFieldSet)) {
      fieldSet = fieldSet.filter(([typeCondition,]) => isTypeSubTypeOf(this.schema, parentType, typeCondition));
      if (fieldSet.length < 1) continue;

      const [,firstField] = fieldSet[0];
      const fieldName = firstField.fieldName;
      const args = firstField.args;
      const type = firstField.type;

      let field = { responseName, fieldName, type };

      if (args && args.length > 0) {
        field.args = args;
      }

      const isConditional = fieldSet.some(([,field]) => {
        return field.directives && field.directives.some(directive => {
          const directiveName = directive.name.value;
          return directiveName == 'skip' || directiveName == 'include';
        });
      });

      if (isConditional) {
        field.isConditional = true;
      }

      if (parentType instanceof GraphQLObjectType || parentType instanceof GraphQLInterfaceType) {
        const fieldDef = parentType.getFields()[fieldName];
        if (fieldDef) {
          const description = fieldDef.description;
          if (description) {
            field.description = description
          }

          Object.assign(field, {
            isDeprecated: fieldDef.isDeprecated,
            deprecationReason: fieldDef.deprecationReason,
          });
        }
      }

      const bareType = getNamedType(type);

      this.addTypeUsed(bareType);

      if (isCompositeType(bareType)) {
        const subSelectionGroupedVisitedFragmentSet = new Map();
        const subSelectionGroupedFieldSet = this.mergeSelectionSets(
          bareType,
          fieldSet,
          subSelectionGroupedVisitedFragmentSet
        );

        const { fields, fragmentSpreads, inlineFragments } = this.resolveFields(
          bareType,
          subSelectionGroupedFieldSet,
          subSelectionGroupedVisitedFragmentSet,
          fragmentsReferencedSet
        );
        Object.assign(field, { fields, fragmentSpreads, inlineFragments });
      }

      fields.push(field);
    }

    const fragmentSpreads = this.fragmentSpreadsForParentType(parentType, groupedVisitedFragmentSet);
    const inlineFragments = this.resolveInlineFragments(parentType, groupedFieldSet, groupedVisitedFragmentSet, fragmentsReferencedSet);

    if (fragmentsReferencedSet) {
      Object.assign(fragmentsReferencedSet, ...groupedVisitedFragmentSet.values());

      // TODO: This is a really inefficient way of keeping track of fragments referenced by other fragments
      // We need to either cache compiled fragments or find a way to make resolveFields smarter
      for (let fragmentName of fragmentSpreads) {
        const fragment = this.fragmentNamed(fragmentName);
        if (!fragment) throw new GraphQLError(`Cannot find fragment "${fragmentName}"`);
        const { fragmentsReferenced: fragmentsReferencedFromFragment } = this.compileFragment(fragment);
        for (let fragmentReferenced of fragmentsReferencedFromFragment) {
          fragmentsReferencedSet[fragmentReferenced] = true;
        }
      }
    }

    return { fields, fragmentSpreads, inlineFragments };
  }

  resolveInlineFragments(parentType, groupedFieldSet, groupedVisitedFragmentSet, fragmentsReferencedSet) {
    return this.collectPossibleTypes(parentType, groupedFieldSet, groupedVisitedFragmentSet).map(typeCondition => {
      const { fields, fragmentSpreads } = this.resolveFields(
        typeCondition,
        groupedFieldSet,
        groupedVisitedFragmentSet,
        fragmentsReferencedSet
      );
      const possibleTypes = this.possibleTypesForType(typeCondition)
      return { typeCondition, possibleTypes, fields, fragmentSpreads };
    });
  }

  collectPossibleTypes(parentType, groupedFieldSet, groupedVisitedFragmentSet) {
    if (!isAbstractType(parentType)) return [];

    const possibleTypes = new Set();

    for (const fieldSet of Object.values(groupedFieldSet)) {
      for (const [typeCondition,] of fieldSet) {
        if (this.schema.isPossibleType(parentType, typeCondition)) {
          possibleTypes.add(typeCondition);
        }
      }
    }

    // Also include type conditions for fragment spreads
    if (groupedVisitedFragmentSet) {
      for (const effectiveType of groupedVisitedFragmentSet.keys()) {
        if (this.schema.isPossibleType(parentType, effectiveType)) {
          possibleTypes.add(effectiveType);
        }
      }
    }

    return Array.from(possibleTypes);
  }

  fragmentSpreadsForParentType(parentType, groupedVisitedFragmentSet) {
    if (!groupedVisitedFragmentSet) return [];

    let fragmentSpreads = new Set();

    for (const [effectiveType, visitedFragmentSet] of groupedVisitedFragmentSet) {
      if (!isTypeProperSuperTypeOf(this.schema, effectiveType, parentType)) continue;

      for (const fragmentName of Object.keys(visitedFragmentSet)) {
        fragmentSpreads.add(fragmentName);
      }
    }

    return Array.from(fragmentSpreads);
  }
}

function augmentCompiledOperationWithFragments(compiledOperation, compiledFragments) {
  const operationAndFragments = operationAndRelatedFragments(compiledOperation, compiledFragments);
  compiledOperation.sourceWithFragments = operationAndFragments.map(operationOrFragment => { 
    return operationOrFragment.source; 
  }).join('\n');
  const idBits = sjcl.hash.sha256.hash(compiledOperation.sourceWithFragments);
  compiledOperation.operationId = sjcl.codec.hex.fromBits(idBits);
}

function operationAndRelatedFragments(compiledOperationOrFragment, allCompiledFragments) {
  let result = flatMap(compiledOperationOrFragment.fragmentsReferenced, (fragmentName) => {
    return operationAndRelatedFragments(allCompiledFragments[fragmentName], allCompiledFragments);
  });
  result.unshift(compiledOperationOrFragment);
  result = uniqBy(result, (compiledOperationOrFragment) => {
    return compiledOperationOrFragment.fragmentName;
  });
  result = result.sort((a, b) => {
    return a.fragmentName > b.fragmentName;
  });
  return result;
}

function argumentsFromAST(args) {
  return args && args.map(arg => {
    return { name: arg.name.value, value: valueFromValueNode(arg.value) };
  });
}

export function printIR({ fields, inlineFragments, fragmentSpreads }) {
  return fields && wrap('<', join(fragmentSpreads, ', '), '> ')
    + block(fields.map(field =>
      `${field.name}: ${String(field.type)}` + wrap(' ', printIR(field))
    ).concat(inlineFragments && inlineFragments.map(inlineFragment =>
      `${String(inlineFragment.typeCondition)}` + wrap(' ', printIR(inlineFragment)))));
}
