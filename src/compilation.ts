import {
  print,
  visit,
  visitWithTypeInfo,
  typeFromAST,
  getNamedType,
  isAbstractType,
  isEqualType,
  isTypeSubTypeOf,
  Kind,
  TypeInfo,
  isType,
  isCompositeType,
  DefinitionNode,
  DirectiveNode,
  DocumentNode,
  GraphQLEnumType,
  GraphQLField,
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLError,
  GraphQLSchema,
  GraphQLType,
  FragmentDefinitionNode,
  OperationDefinitionNode,
  SelectionSetNode,
  Location,
} from 'graphql';

import {
  isTypeProperSuperTypeOf,
  getOperationRootType,
  getFieldDef
} from './utilities/graphql';

import {
  join,
  block,
  wrap,
  indent
} from './utilities/printing';

type ParentType = GraphQLObjectType | GraphQLInterfaceType | GraphQLUnionType

interface GroupedFieldNode {
  responseName: string;
  fieldName: string;
  type: GraphQLType;
  directives?: DirectiveNode[];
  selectionSet?: SelectionSetNode;
}

type GroupedFieldTuple = [ParentType, GroupedFieldNode]

export interface GroupedFieldSet {
  [responseName: string]: GroupedFieldTuple[];
}

export interface Compiled {
  fragmentName?: string;
  source?: string;
  typeCondition?: GraphQLType;
  fields?: any;
  fragmentSpreads?: any;
  inlineFragments?: any;
  fragmentsReferenced?: string[];
}
// Parts of this code are adapted from graphql-js

export function compileToIR(schema: GraphQLSchema, document: DocumentNode) {
  const compiler = new Compiler(schema, document);

  const operations = Object.create(null);

  compiler.operations.forEach(operation => {
    operations[operation.name!.value] = compiler.compileOperation(operation)
  });

  const fragments = Object.create(null);

  compiler.fragments.forEach(fragment => {
    fragments[fragment.name.value] = compiler.compileFragment(fragment)
  });

  const typesUsed = compiler.typesUsed;

  return { schema, operations, fragments, typesUsed };
}

export class Compiler {
  typesUsedSet: Set<GraphQLEnumType | GraphQLInputObjectType> = new Set();
  fragmentMap: {[key: string]: FragmentDefinitionNode} = Object.create(null);
  operations: OperationDefinitionNode[] = [];
  compiledFragmentMap = Object.create(null);


  constructor(public schema: GraphQLSchema, document: DocumentNode) {

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
  }

  addTypeUsed(type: GraphQLType) {
    if (type instanceof GraphQLEnumType || type instanceof GraphQLInputObjectType) {
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

  compileOperation(operationDefinition: OperationDefinitionNode) {
    const operationName = operationDefinition.name!.value;
    const operationType = operationDefinition.operation;

    const variables = operationDefinition.variableDefinitions!.map(node => {
      const name = node.variable.name.value;
      const type = typeFromAST(this.schema, node.type);
      this.addTypeUsed(getNamedType(type));
      return { name, type };
    });

    const source = print(withTypenameFieldAddedWhereNeeded(this.schema, operationDefinition));

    const rootType = getOperationRootType(this.schema, operationDefinition);

    const groupedVisitedFragmentSet = new Map();
    const groupedFieldSet = this.collectFields(rootType, operationDefinition.selectionSet, undefined, groupedVisitedFragmentSet);

    const fragmentsReferencedSet = Object.create(null);
    const { fields } = this.resolveFields(rootType, groupedFieldSet, groupedVisitedFragmentSet, fragmentsReferencedSet);
    const fragmentsReferenced = Object.keys(fragmentsReferencedSet);

    return { operationName, operationType, variables, source, fields, fragmentsReferenced };
  }

  compileFragment(fragmentDefinition: FragmentDefinitionNode): Compiled {
    const fragmentName = fragmentDefinition.name.value;

    const source = print(withTypenameFieldAddedWhereNeeded(this.schema, fragmentDefinition));

    const typeCondition = typeFromAST(this.schema, fragmentDefinition.typeCondition) as GraphQLObjectType;

    const groupedVisitedFragmentSet = new Map();
    const groupedFieldSet = this.collectFields(typeCondition, fragmentDefinition.selectionSet, undefined, groupedVisitedFragmentSet);

    const fragmentsReferencedSet = Object.create(null);
    const { fields, fragmentSpreads, inlineFragments } = this.resolveFields(typeCondition, groupedFieldSet, groupedVisitedFragmentSet, fragmentsReferencedSet);
    const fragmentsReferenced = Object.keys(fragmentsReferencedSet);

    return { fragmentName, source, typeCondition, fields, fragmentSpreads, inlineFragments, fragmentsReferenced };
  }

  collectFields(parentType: GraphQLObjectType, selectionSet: SelectionSetNode, groupedFieldSet: GroupedFieldSet | null = Object.create(null), groupedVisitedFragmentSet = new Map<GraphQLType, {[key: string]: boolean}>()) {
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

            groupedFieldSet[responseName].push([parentType, { responseName, fieldName, type: field.type, directives: selection.directives, selectionSet: selection.selectionSet }]);
          }
          break;
        }
        case Kind.INLINE_FRAGMENT: {
          const typeCondition = selection.typeCondition;
          const inlineFragmentType = typeCondition ?
            typeFromAST(this.schema, typeCondition) as GraphQLObjectType :
            parentType;

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
          const fragmentType = typeFromAST(this.schema, typeCondition) as GraphQLObjectType

          if (groupedVisitedFragmentSet) {
            let visitedFragmentSet = groupedVisitedFragmentSet.get(parentType);
            if (!visitedFragmentSet) {
              visitedFragmentSet = {};
              groupedVisitedFragmentSet.set(parentType, visitedFragmentSet);
            }

            if (visitedFragmentSet[fragmentName]) continue;
            visitedFragmentSet[fragmentName] = true;
          }

          const effectiveType = parentType instanceof GraphQLObjectType ? parentType : fragmentType;

          this.collectFields(
            effectiveType,
            fragment.selectionSet,
            null,
            groupedVisitedFragmentSet
          );
          break;
        }
      }
    }

    return groupedFieldSet;
  }

  mergeSelectionSets(parentType: GraphQLObjectType, fieldSet: any[], groupedVisitedFragmentSet: Map<GraphQLType, {[key: string]: boolean}>) {
    const groupedFieldSet: GroupedFieldSet = Object.create(null);

    for (const [,field] of fieldSet) {
      const selectionSet = field.selectionSet;

      if (selectionSet) {
        this.collectFields(parentType, selectionSet, groupedFieldSet, groupedVisitedFragmentSet);
      }
    }

    return groupedFieldSet;
  }

  resolveFields(parentType: GraphQLObjectType, groupedFieldSet: GroupedFieldSet | null, groupedVisitedFragmentSet: Map<GraphQLType, {[key: string]: boolean}>, fragmentsReferencedSet: any): Compiled {
    const fields = [];

    for (let [responseName, fieldSet] of Object.entries(groupedFieldSet)) {
      fieldSet = fieldSet.filter(([typeCondition,]: any[]) => isTypeSubTypeOf(this.schema, parentType, typeCondition));
      if (fieldSet.length < 1) continue;

      const [,firstField] = fieldSet[0];
      const fieldName = firstField.fieldName;
      const type = firstField.type;

      let field = { responseName, fieldName, type, isConditional: false };

      const isConditional = fieldSet.some(([,field]: any[]) => {
        return field.directives && field.directives.some((directive: any) => {
          const directiveName = directive.name.value;
          return directiveName == 'skip' || directiveName == 'include';
        });
      });

      if (isConditional) {
        field.isConditional = true;
      }

      const bareType = getNamedType(type) as GraphQLObjectType;

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
        for (let fragmentReferenced of fragmentsReferencedFromFragment!) {
          fragmentsReferencedSet[fragmentReferenced] = true;
        }
      }
    }

    return { fields, fragmentSpreads, inlineFragments };
  }

  resolveInlineFragments(parentType: GraphQLObjectType, groupedFieldSet: any, groupedVisitedFragmentSet: any, fragmentsReferencedSet: any) {
    return this.collectPossibleTypes(parentType, groupedFieldSet, groupedVisitedFragmentSet).map(typeCondition => {
      const { fields, fragmentSpreads } = this.resolveFields(
        typeCondition,
        groupedFieldSet,
        groupedVisitedFragmentSet,
        fragmentsReferencedSet
      );
      return { typeCondition, fields, fragmentSpreads };
    });
  }

  collectPossibleTypes(parentType: GraphQLObjectType, groupedFieldSet: any, groupedVisitedFragmentSet: any) {
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

  fragmentSpreadsForParentType(parentType: GraphQLObjectType, groupedVisitedFragmentSet: any) {
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

const typenameField = { kind: Kind.FIELD, name: { kind: Kind.NAME, value: '__typename' } };

function withTypenameFieldAddedWhereNeeded(schema: GraphQLSchema, ast: any) {
  const typeInfo = new TypeInfo(schema, undefined as any /* remove after https://github.com/DefinitelyTyped/DefinitelyTyped/pull/13438 is merged */);

  return visit(ast, visitWithTypeInfo(typeInfo, {
    leave: {
      SelectionSet: (node: any) => {
        const parentType = typeInfo.getParentType();

        if (isAbstractType(parentType)) {
          return { ...node, selections: [typenameField, ...node.selections] };
        }
      }
    }
  }), undefined as any);
}

function sourceAt(location: Location) {
  return location.source.body.slice(location.start, location.end);
}

export function printIR({ fields, inlineFragments, fragmentSpreads }: Compiled) {
  return fields && wrap('<', join(fragmentSpreads, ', '), '> ')
    + block(fields.map((field: any) =>
      `${field.name}: ${String(field.type)}` + wrap(' ', printIR(field))
    ).concat(inlineFragments && inlineFragments.map((inlineFragment: any) =>
      `${String(inlineFragment.typeCondition)}` + wrap(' ', printIR(inlineFragment)))));
}
