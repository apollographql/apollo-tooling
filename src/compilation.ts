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

import { join, block, wrap, indent } from './utilities/printing';

import {
  createHash,
} from 'crypto';

export interface CompilerOptions {
  addTypename?: boolean;
  mergeInFieldsFromFragmentSpreads?: boolean;
  passthroughCustomScalars?: boolean;
  customScalarsPrefix?: string;
  namespace?: string;
  generateOperationIds?: boolean;
}

export interface CompilationContext {
  schema: GraphQLSchema;
  operations: { [operationName: string]: CompiledOperation };
  fragments: { [fragmentName: string]: CompiledFragment };
  typesUsed: GraphQLType[];
  options: CompilerOptions;
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
  fragmentSpreads?: string[];
  inlineFragments?: CompiledInlineFragment[];
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

export interface CompiledInlineFragment {
  typeCondition: GraphQLObjectType;
  possibleTypes: GraphQLObjectType[];
  fields: Field[];
  fragmentSpreads: string[];
}

export interface Field {
  responseName: string;
  fieldName: string;
  args?: Argument[];
  type: GraphQLType;
  description?: string;
  directives?: DirectiveNode[];
  selectionSet?: SelectionSetNode;
  isConditional?: boolean;
  isDeprecated?: boolean;
  deprecationReason?: string;
  fields?: Field[];
  fragmentSpreads?: string[];
  inlineFragments?: CompiledInlineFragment[];
}

export interface Argument {
  name: string;
  value: any;
}

type GroupedFieldSet = Map<string, FieldSet>;
type FieldSet = [GraphQLCompositeType, Field][];

type VisitedFragmentSet = Set<string>;
type GroupedVisitedFragmentSet = Map<GraphQLCompositeType, VisitedFragmentSet>;
type FragmentsReferencedSet = Set<string>;

// Parts of this code are adapted from graphql-js

export function compileToIR(
  schema: GraphQLSchema,
  document: DocumentNode,
  options: CompilerOptions = { mergeInFieldsFromFragmentSpreads: true }
): CompilationContext {
  if (options.addTypename) {
    document = withTypenameFieldAddedWhereNeeded(schema, document);
  }

  const compiler = new Compiler(schema, document, options);

  const operations: {
    [operationName: string]: CompiledOperation;
  } = Object.create(null);

  compiler.compiledOperations.forEach(operation => {
    operations[operation.operationName] = operation;
  });

  const fragments: { [fragmentName: string]: CompiledFragment } = Object.create(null);
  for (const [fragmentName, compiledFragment] of compiler.compiledFragmentMap.entries()) {
    fragments[fragmentName] = compiledFragment;
  }

  const typesUsed = compiler.typesUsed;

  return { schema, operations, fragments, typesUsed, options };
}

class Compiler {
  options: CompilerOptions;
  schema: GraphQLSchema;

  fragmentMap: Map<string, FragmentDefinitionNode>;

  compiledOperations: CompiledOperation[];
  compiledFragmentMap: Map<string, CompiledFragment>;
  typesUsedSet: Set<GraphQLType>;

  constructor(schema: GraphQLSchema, document: DocumentNode, options: CompilerOptions) {
    this.schema = schema;
    this.options = options;

    this.typesUsedSet = new Set();

    this.fragmentMap = new Map();
    const operations: OperationDefinitionNode[] = [];

    for (const definition of document.definitions) {
      switch (definition.kind) {
        case Kind.OPERATION_DEFINITION:
          operations.push(definition);
          break;
        case Kind.FRAGMENT_DEFINITION:
          this.fragmentMap.set(definition.name.value, definition);
          break;
      }
    }

    this.compiledFragmentMap = new Map();

    this.compiledOperations = operations.map(this.compileOperation, this);
    for (const fragmentName of this.fragmentMap.keys()) {
      this.compiledFragmentNamed(fragmentName);
    }
  }

  addTypeUsed(type: GraphQLType) {
    if (this.typesUsedSet.has(type)) return;

    if (
      type instanceof GraphQLEnumType ||
      type instanceof GraphQLInputObjectType ||
      (type instanceof GraphQLScalarType && !isBuiltInScalarType(type))
    ) {
      this.typesUsedSet.add(type);
    }
    if (type instanceof GraphQLInputObjectType) {
      for (const field of Object.values(type.getFields())) {
        this.addTypeUsed(getNamedType(field.type));
      }
    }
  }

  get typesUsed(): GraphQLType[] {
    return Array.from(this.typesUsedSet);
  }

  compileOperation(operationDefinition: OperationDefinitionNode): CompiledOperation {
    if (!operationDefinition.name) {
      throw new Error('Operations should be named');
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
    const groupedFieldSet = this.collectFields(
      rootType,
      operationDefinition.selectionSet,
      undefined,
      groupedVisitedFragmentSet
    );

    const fragmentsReferencedSet = new Set();
    const { fields } = this.resolveFields(
      rootType,
      groupedFieldSet,
      groupedVisitedFragmentSet,
      fragmentsReferencedSet
    );
    const fragmentsReferenced = Array.from(fragmentsReferencedSet.keys());

    const sourceWithFragments = [
      source,
      ...fragmentsReferenced.map(fragmentName => {
        return this.compiledFragmentNamed(fragmentName).source;
      })
    ].join('\n');

  const hash = createHash('sha256')
  hash.update(sourceWithFragments)
  const operationId = hash.digest('hex');

    return {
      filePath,
      operationName,
      operationType,
      rootType,
      variables,
      source,
      fields,
      fragmentsReferenced,
      sourceWithFragments,
      operationId
    };
  }

  fragmentNamed(fragmentName: string): FragmentDefinitionNode {
    const fragment = this.fragmentMap.get(fragmentName);
    if (!fragment) {
      throw new GraphQLError(`Cannot find fragment "${fragmentName}"`);
    }
    return fragment;
  }

  compiledFragmentNamed(fragmentName: string): CompiledFragment {
    const fragment = this.fragmentNamed(fragmentName);

    const filePath = filePathForNode(fragment);

    const source = print(fragment);

    const typeCondition = typeFromAST(this.schema, fragment.typeCondition) as GraphQLCompositeType;
    const possibleTypes = this.possibleTypesForType(typeCondition);

    const groupedVisitedFragmentSet = new Map();
    const groupedFieldSet = this.collectFields(
      typeCondition,
      fragment.selectionSet,
      undefined,
      groupedVisitedFragmentSet
    );

    const fragmentsReferencedSet = new Set();
    const { fields, fragmentSpreads, inlineFragments } = this.resolveFields(
      typeCondition,
      groupedFieldSet,
      groupedVisitedFragmentSet,
      fragmentsReferencedSet
    );
    const fragmentsReferenced = Array.from(fragmentsReferencedSet.keys());

    const compiledFragment: CompiledFragment = {
      filePath,
      fragmentName,
      source,
      typeCondition,
      possibleTypes,
      fields,
      fragmentSpreads,
      inlineFragments,
      fragmentsReferenced
    };

    this.compiledFragmentMap.set(fragmentName, compiledFragment);

    return compiledFragment;
  }

  collectFields(
    parentType: GraphQLCompositeType,
    selectionSet: SelectionSetNode,
    groupedFieldSet: GroupedFieldSet = new Map(),
    groupedVisitedFragmentSet: GroupedVisitedFragmentSet = new Map()
  ): GroupedFieldSet {
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
            throw new GraphQLError(`Cannot query field "${fieldName}" on type "${String(parentType)}"`, [
              selection
            ]);
          }

          let fieldSet = groupedFieldSet.get(responseName);
          if (!fieldSet) {
            fieldSet = [];
            groupedFieldSet.set(responseName, fieldSet);
          }

          fieldSet.push([
            parentType,
            {
              responseName,
              fieldName,
              args: selection.arguments ? argumentsFromAST(selection.arguments) : undefined,
              type: field.type,
              directives: selection.directives,
              selectionSet: selection.selectionSet
            }
          ]);

          break;
        }
        case Kind.INLINE_FRAGMENT: {
          const typeCondition = selection.typeCondition;
          const inlineFragmentType = typeCondition
            ? typeFromAST(this.schema, typeCondition) as GraphQLCompositeType
            : parentType;

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

          const typeCondition = fragment.typeCondition;
          const fragmentType = typeFromAST(this.schema, typeCondition) as GraphQLCompositeType;

          let visitedFragmentSet = groupedVisitedFragmentSet.get(parentType);
          if (!visitedFragmentSet) {
            visitedFragmentSet = new Set();
            groupedVisitedFragmentSet.set(parentType, visitedFragmentSet);
          }

          if (visitedFragmentSet.has(fragmentName)) continue;
          visitedFragmentSet.add(fragmentName);

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

  possibleTypesForType(type: GraphQLCompositeType): GraphQLObjectType[] {
    if (isAbstractType(type)) {
      return this.schema.getPossibleTypes(type);
    } else {
      return [type];
    }
  }

  mergeSelectionSets(
    parentType: GraphQLCompositeType,
    fieldSet: FieldSet,
    groupedVisitedFragmentSet: GroupedVisitedFragmentSet
  ): GroupedFieldSet {
    const groupedFieldSet = new Map();

    for (const [, field] of fieldSet) {
      const selectionSet = field.selectionSet;

      if (selectionSet) {
        this.collectFields(parentType, selectionSet, groupedFieldSet, groupedVisitedFragmentSet);
      }
    }

    return groupedFieldSet;
  }

  resolveFields(
    parentType: GraphQLCompositeType,
    groupedFieldSet: GroupedFieldSet,
    groupedVisitedFragmentSet: GroupedVisitedFragmentSet,
    fragmentsReferencedSet: FragmentsReferencedSet
  ): {
    fields: Field[];
    fragmentSpreads: string[];
    inlineFragments: CompiledInlineFragment[];
  } {
    const fields = [];

    for (let [responseName, fieldSet] of groupedFieldSet.entries()) {
      fieldSet = fieldSet.filter(([typeCondition]) =>
        isTypeSubTypeOf(this.schema, parentType, typeCondition)
      );
      if (fieldSet.length < 1) continue;

      const [, firstField] = fieldSet[0];
      const fieldName = firstField.fieldName;
      const args = firstField.args;
      const type = firstField.type;

      let field: Field = { responseName, fieldName, type };

      if (args && args.length > 0) {
        field.args = args;
      }

      const isConditional = fieldSet.some(([, field]) => {
        return (
          !!field.directives &&
          field.directives.some(directive => {
            const directiveName = directive.name.value;
            return directiveName == 'skip' || directiveName == 'include';
          })
        );
      });

      if (isConditional) {
        field.isConditional = true;
      }

      if (parentType instanceof GraphQLObjectType || parentType instanceof GraphQLInterfaceType) {
        const fieldDef = parentType.getFields()[fieldName];
        if (fieldDef) {
          const description = fieldDef.description;
          if (description) {
            field.description = description;
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
        field = { ...field, fields, fragmentSpreads, inlineFragments };
      }

      fields.push(field);
    }

    const fragmentSpreads = this.fragmentSpreadsForParentType(parentType, groupedVisitedFragmentSet);
    const inlineFragments = this.resolveInlineFragments(
      parentType,
      groupedFieldSet,
      groupedVisitedFragmentSet,
      fragmentsReferencedSet
    );

    if (fragmentsReferencedSet) {
      for (const visitedFragmentSet of groupedVisitedFragmentSet.values()) {
        for (const visitedFragment of visitedFragmentSet) {
          fragmentsReferencedSet.add(visitedFragment);
        }
      }

      for (let fragmentName of fragmentSpreads) {
        const compiledFragment = this.compiledFragmentNamed(fragmentName);
        for (let fragmentReferenced of compiledFragment.fragmentsReferenced) {
          fragmentsReferencedSet.add(fragmentReferenced);
        }
      }
    }

    return { fields, fragmentSpreads, inlineFragments };
  }

  resolveInlineFragments(
    parentType: GraphQLCompositeType,
    groupedFieldSet: GroupedFieldSet,
    groupedVisitedFragmentSet: GroupedVisitedFragmentSet,
    fragmentsReferencedSet: FragmentsReferencedSet
  ): CompiledInlineFragment[] {
    return this.collectPossibleTypes(
      parentType,
      groupedFieldSet,
      groupedVisitedFragmentSet
    ).map(typeCondition => {
      const { fields, fragmentSpreads } = this.resolveFields(
        typeCondition,
        groupedFieldSet,
        groupedVisitedFragmentSet,
        fragmentsReferencedSet
      );
      const possibleTypes = this.possibleTypesForType(typeCondition);
      return { typeCondition, possibleTypes, fields, fragmentSpreads };
    });
  }

  collectPossibleTypes(
    parentType: GraphQLCompositeType,
    groupedFieldSet: GroupedFieldSet,
    groupedVisitedFragmentSet: GroupedVisitedFragmentSet
  ): GraphQLObjectType[] {
    if (!isAbstractType(parentType)) return [];

    const possibleTypes = new Set<GraphQLObjectType>();

    for (const fieldSet of groupedFieldSet.values()) {
      for (const [typeCondition] of fieldSet) {
        if (
          typeCondition instanceof GraphQLObjectType &&
          this.schema.isPossibleType(parentType, typeCondition)
        ) {
          possibleTypes.add(typeCondition);
        }
      }
    }

    // Also include type conditions for fragment spreads
    if (groupedVisitedFragmentSet) {
      for (const effectiveType of groupedVisitedFragmentSet.keys()) {
        if (
          effectiveType instanceof GraphQLObjectType &&
          this.schema.isPossibleType(parentType, effectiveType)
        ) {
          possibleTypes.add(effectiveType);
        }
      }
    }

    return Array.from(possibleTypes);
  }

  fragmentSpreadsForParentType(
    parentType: GraphQLCompositeType,
    groupedVisitedFragmentSet: GroupedVisitedFragmentSet
  ): string[] {
    if (!groupedVisitedFragmentSet) return [];

    let fragmentSpreads = new Set();

    for (const [effectiveType, visitedFragmentSet] of groupedVisitedFragmentSet) {
      if (!isTypeProperSuperTypeOf(this.schema, effectiveType, parentType)) continue;

      for (const fragmentName of visitedFragmentSet.keys()) {
        fragmentSpreads.add(fragmentName);
      }
    }

    return Array.from(fragmentSpreads);
  }
}

function argumentsFromAST(args: ArgumentNode[]): Argument[] {
  return (
    args &&
    args.map(arg => {
      return { name: arg.name.value, value: valueFromValueNode(arg.value) };
    })
  );
}
