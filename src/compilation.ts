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
  GraphQLError,
  GraphQLSchema,
  GraphQLType,
  GraphQLCompositeType,
  DocumentNode,
  OperationDefinitionNode,
  FragmentDefinitionNode,
  VariableNode,
  SelectionSetNode,
  FieldNode,
  ArgumentNode,
  DirectiveNode
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

import {
  createHash,
} from 'crypto';

export interface CompilerOptions {
  addTypename?: boolean;
  mergeInFieldsFromFragmentSpreads?: boolean;
}

export interface CompiledOperation { 
  filePath?: string;
  operationName: string;
  operationId?: string;
  operationType: string;
  rootType: GraphQLObjectType;
  variables: {
    name: string;
    type: GraphQLType;
  }[];
  source: string;
  sourceWithFragments?: string;
  fields: Field[];
  fragmentsReferenced: string[];
}

export interface CompiledFragment { 
  filePath?: string; 
  fragmentName: string;
  source: string;
  typeCondition: GraphQLCompositeType;
  possibleTypes: GraphQLObjectType[];
    fields: Field[];
  fragmentSpreads: string[];
  inlineFragments: any[];
  fragmentsReferenced: string[];
}

export interface CompiledSelectionSet {
  fields: Field[];
  fragmentSpreads: string[];
  inlineFragments: any[];
}

export interface Field {
  responseName: string;
  fieldName: string;
  args?: { [name:string]: any }[];
  type: GraphQLType;
  description?: string;
  directives?: DirectiveNode[];
  selectionSet?: SelectionSetNode;
  isConditional?: boolean;
  isDeprecated?: boolean;
  deprecationReason?: string;
  fields?: Field[];
  fragmentSpreads?: string[];
  inlineFragments?: any[];
}

type GroupedFieldSet = { [responseName: string]: FieldSet };
type FieldSet = [GraphQLCompositeType, Field][];

type VisitedFragmentSet = { [fragmentName: string]: boolean };
type GroupedVisitedFragmentSet = Map<GraphQLCompositeType, VisitedFragmentSet>;
type FragmentsReferencedSet = { [fragmentName: string]: boolean };

// Parts of this code are adapted from graphql-js

export function compileToIR(schema: GraphQLSchema, document: DocumentNode, options: CompilerOptions = { mergeInFieldsFromFragmentSpreads: true }) {
  if (options.addTypename) {
    document = withTypenameFieldAddedWhereNeeded(schema, document);
  }

  const compiler = new Compiler(schema, document, options);

  const operations = Object.create(null);

  compiler.operations.forEach(operation => {
    if (!operation.name) {
      throw new Error("Operations should be named");
    }
    operations[operation.name.value] = compiler.compileOperation(operation)
  });

  const fragments = Object.create(null);

  compiler.fragments.forEach(fragment => {
    if (!fragment.name) {
      throw new Error("Fragments should be named");
    }
    fragments[fragment.name.value] = compiler.compileFragment(fragment)
  });

  Object.values(operations).forEach(operation => {
    augmentCompiledOperationWithFragments(operation, fragments)
  });

  const typesUsed = compiler.typesUsed;

  return { schema, operations, fragments, typesUsed };
}

export class Compiler {
  options: CompilerOptions;
  schema: GraphQLSchema;
  typesUsedSet: Set<GraphQLType>;
  operations: OperationDefinitionNode[];
  fragmentMap: { [name: string]: FragmentDefinitionNode };
  compiledFragmentMap: { [name: string]: CompiledFragment };

  constructor(schema: GraphQLSchema, document: DocumentNode, options: CompilerOptions) {
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

  addTypeUsed(type: GraphQLType) {
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

  fragmentNamed(fragmentName: string) {
    return this.fragmentMap[fragmentName];
  }

  get fragments() {
    return Object.values(this.fragmentMap);
  }

  compileOperation(operationDefinition: OperationDefinitionNode): CompiledOperation {
    if (!operationDefinition.name) {
      throw new Error("Operations should be named");
    }
    
    const filePath = filePathForNode(operationDefinition);
    const operationName = operationDefinition.name.value;
    const operationType = operationDefinition.operation;

    const variables = (operationDefinition.variableDefinitions || []).map(node => {
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

  compileFragment(fragmentDefinition: FragmentDefinitionNode): CompiledFragment {
    const filePath = filePathForNode(fragmentDefinition);
    const fragmentName = fragmentDefinition.name.value;

    const source = print(fragmentDefinition);

    const typeCondition = typeFromAST(this.schema, fragmentDefinition.typeCondition) as GraphQLCompositeType;
    const possibleTypes = this.possibleTypesForType(typeCondition)

    const groupedVisitedFragmentSet = new Map();
    const groupedFieldSet = this.collectFields(typeCondition, fragmentDefinition.selectionSet, undefined, groupedVisitedFragmentSet);

    const fragmentsReferencedSet = Object.create(null);
    const { fields, fragmentSpreads, inlineFragments } = this.resolveFields(typeCondition, groupedFieldSet, groupedVisitedFragmentSet, fragmentsReferencedSet);
    const fragmentsReferenced = Object.keys(fragmentsReferencedSet);

    return { filePath, fragmentName, source, typeCondition, possibleTypes, fields, fragmentSpreads, inlineFragments, fragmentsReferenced };
  }

  collectFields(parentType: GraphQLCompositeType, selectionSet: SelectionSetNode, groupedFieldSet: GroupedFieldSet = Object.create(null), groupedVisitedFragmentSet: GroupedVisitedFragmentSet = new Map()) {
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
              args: selection.arguments ? argumentsFromAST(selection.arguments) : undefined,
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
            typeFromAST(this.schema, typeCondition) as GraphQLCompositeType :
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
          const fragmentType = typeFromAST(this.schema, typeCondition) as GraphQLCompositeType;

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
            this.options.mergeInFieldsFromFragmentSpreads ? groupedFieldSet : undefined,
            groupedVisitedFragmentSet
          );
          break;
        }
      }
    }

    return groupedFieldSet;
  }

  possibleTypesForType(type: GraphQLCompositeType) {
    if (isAbstractType(type)) {
      return this.schema.getPossibleTypes(type);
    } else {
      return [type];
    }
  }

  mergeSelectionSets(parentType: GraphQLCompositeType, fieldSet: FieldSet, groupedVisitedFragmentSet: GroupedVisitedFragmentSet) {
    const groupedFieldSet = Object.create(null);

    for (const [,field] of fieldSet) {
      const selectionSet = field.selectionSet;

      if (selectionSet) {
        this.collectFields(parentType, selectionSet, groupedFieldSet, groupedVisitedFragmentSet);
      }
    }

    return groupedFieldSet;
  }

  resolveFields(parentType: GraphQLCompositeType, groupedFieldSet: GroupedFieldSet, groupedVisitedFragmentSet: GroupedVisitedFragmentSet, fragmentsReferencedSet: FragmentsReferencedSet): CompiledSelectionSet {
    const fields = [];

    for (let [responseName, fieldSet] of Object.entries(groupedFieldSet)) {
      fieldSet = fieldSet.filter(([typeCondition,]) => isTypeSubTypeOf(this.schema, parentType, typeCondition));
      if (fieldSet.length < 1) continue;

      const [,firstField] = fieldSet[0];
      const fieldName = firstField.fieldName;
      const args = firstField.args;
      const type = firstField.type;

      let field: Field = { responseName, fieldName, type };

      if (args && args.length > 0) {
        field.args = args;
      }

      const isConditional = fieldSet.some(([,field]) => {
        return !!field.directives && field.directives.some(directive => {
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

          field.isDeprecated = fieldDef.isDeprecated;
          field.deprecationReason = fieldDef.deprecationReason;
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
        field = { ...field, fields, fragmentSpreads, inlineFragments }
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

  resolveInlineFragments(parentType: GraphQLCompositeType, groupedFieldSet: GroupedFieldSet, groupedVisitedFragmentSet: GroupedVisitedFragmentSet, fragmentsReferencedSet: FragmentsReferencedSet) {
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

  collectPossibleTypes(parentType: GraphQLCompositeType, groupedFieldSet: GroupedFieldSet, groupedVisitedFragmentSet: GroupedVisitedFragmentSet) {
    if (!isAbstractType(parentType)) return [];

    const possibleTypes = new Set();

    for (const fieldSet of Object.values(groupedFieldSet)) {
      for (const [typeCondition,] of fieldSet) {
        if (typeCondition instanceof GraphQLObjectType && this.schema.isPossibleType(parentType, typeCondition)) {
          possibleTypes.add(typeCondition);
        }
      }
    }

    // Also include type conditions for fragment spreads
    if (groupedVisitedFragmentSet) {
      for (const effectiveType of groupedVisitedFragmentSet.keys()) {
        if (effectiveType instanceof GraphQLObjectType && this.schema.isPossibleType(parentType, effectiveType)) {
          possibleTypes.add(effectiveType);
        }
      }
    }

    return Array.from(possibleTypes);
  }

  fragmentSpreadsForParentType(parentType: GraphQLCompositeType, groupedVisitedFragmentSet: GroupedVisitedFragmentSet): string[] {
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

function augmentCompiledOperationWithFragments(compiledOperation: CompiledOperation, compiledFragments: { [fragmentName: string]: CompiledFragment }) {
  const operationAndFragments = operationAndRelatedFragments(compiledOperation, compiledFragments);
  compiledOperation.sourceWithFragments = operationAndFragments.map(operationOrFragment => { 
    return operationOrFragment.source; 
  }).join('\n');
  const hash = createHash('sha256')
  hash.update(compiledOperation.sourceWithFragments)
  compiledOperation.operationId = hash.digest('hex');
}

function operationAndRelatedFragments(compiledOperationOrFragment: CompiledOperation | CompiledFragment, allCompiledFragments: { [fragmentName: string]: CompiledFragment }): (CompiledOperation | CompiledFragment)[] {
  let result: (CompiledOperation | CompiledFragment)[] = flatMap(compiledOperationOrFragment.fragmentsReferenced, (fragmentName) => {
    return operationAndRelatedFragments(allCompiledFragments[fragmentName], allCompiledFragments);
  });
  result.unshift(compiledOperationOrFragment);
  result = uniqBy(result, compiledOperationOrFragment => {
    return (<CompiledFragment>compiledOperationOrFragment).fragmentName;
  });
  result = result.sort((a, b) => {
    if ((<CompiledFragment>a).fragmentName < (<CompiledFragment>b).fragmentName) {
      return -1;
    } else if ((<CompiledFragment>a).fragmentName > (<CompiledFragment>b).fragmentName) {
      return 1;
    } else {
      return 0;
    }
  });
  return result;
}

function argumentsFromAST(args: ArgumentNode[]) {
  return args && args.map(arg => {
    return { name: arg.name.value, value: valueFromValueNode(arg.value) };
  });
}
