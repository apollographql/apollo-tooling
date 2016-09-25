import {
  visit,
  visitWithTypeInfo,
  typeFromAST,
  getNamedType,
  isTypeSubTypeOf,
  Kind,
  TypeInfo,
  isCompositeType,
  GraphQLEnumType,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLError
} from 'graphql';

import {
  join,
  block,
  wrap,
  indent
} from './utilities/printing';

// Parts of this code are adapted from graphql-js

export class CompilationContext {
  constructor(schema, document) {
    this.schema = schema;

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

  compileOperations() {
    return this.operations.map(this.compileOperation, this);
  }

  compileOperation(operationDefinition) {
    const operationName = operationDefinition.name.value;

    const variables = operationDefinition.variableDefinitions.map(node => {
      const name = node.variable.name.value;
      const type = typeFromAST(this.schema, node.type);
      this.typesUsedSet.add(type);
      return { name, type };
    });

    const rootType = this.rootTypeForOperation(operationDefinition);
    const { groupedFieldSet, visitedFragmentSet } =
      this.collectFields(rootType, operationDefinition.selectionSet);
    const { fields, fragmentsReferencedSet } = this.resolveFields(rootType, groupedFieldSet);

    return { operationName, variables, source: sourceAt(operationDefinition.loc), fragmentsReferenced: Object.keys(fragmentsReferencedSet), fields };
  }

  compileFragments() {
    return this.fragments.map(this.compileFragment, this);
  }

  compileFragment(fragmentDefinition) {
    const fragmentName = fragmentDefinition.name.value;
    const fragmentType = typeFromAST(this.schema, fragmentDefinition.typeCondition);

    const { groupedFieldSet, visitedFragmentSet } =
      this.collectFields(fragmentType, fragmentDefinition.selectionSet);
    const { fields, fragmentsReferencedSet } = this.resolveFields(fragmentType, groupedFieldSet);

    return { fragmentName, source: sourceAt(fragmentDefinition.loc), fields };
  }

  collectFields(parentType, selectionSet, groupedFieldSet = Object.create(null), visitedFragmentSet = Object.create(null)) {
    if (!isCompositeType(parentType)) {
      throw new Error(`parentType should be a composite type, but is "${String(parentType)}"`);
    }

    for (const selection of selectionSet.selections) {
      switch (selection.kind) {
        case Kind.FIELD: {
          const fieldName = selection.name.value;
          const responseName = selection.alias ? selection.alias.value : fieldName;

          const field = parentType.getFields()[fieldName];
          if (!field) {
            throw new GraphQLError(`Cannot query field "${fieldName}" on type "${String(parentType)}"`, [selection]);
          }
          const fieldType = field.type;

          if (!groupedFieldSet[responseName]) {
            groupedFieldSet[responseName] = [];
          }

          groupedFieldSet[responseName].push([parentType, { ...selection, type: fieldType }]);
          break;
        }
        case Kind.INLINE_FRAGMENT: {
          const typeCondition = selection.typeCondition;
          const inlineFragmentType = typeCondition ?
            typeFromAST(this.schema, typeCondition) :
            parentType;

          if (!isTypeSubTypeOf(this.schema, inlineFragmentType, parentType)) continue;

          this.collectFields(
            inlineFragmentType,
            selection.selectionSet,
            groupedFieldSet,
            visitedFragmentSet
          );
          break;
        }
        case Kind.FRAGMENT_SPREAD: {
          const fragmentName = selection.name.value;

          if (visitedFragmentSet[fragmentName]) continue;
          visitedFragmentSet[fragmentName] = true;

          const fragment = this.fragmentNamed(fragmentName);
          if (!fragment) continue;

          const typeCondition = fragment.typeCondition;
          const fragmentType = typeFromAST(this.schema, typeCondition)

          if (!isTypeSubTypeOf(this.schema, fragmentType, parentType)) continue;

          this.collectFields(
            fragmentType,
            fragment.selectionSet,
            groupedFieldSet,
            visitedFragmentSet
          );
          break;
        }
      }
    }
    return { groupedFieldSet, visitedFragmentSet };
  }

  mergeSelectionSets(parentType, fieldSet) {
    const groupedFieldSet = Object.create(null);
    const visitedFragmentSet = Object.create(null);

    for (const [typeCondition, field] of fieldSet) {
      const selectionSet = field.selectionSet;
      if (selectionSet) {
       this.collectFields(parentType, selectionSet, groupedFieldSet, visitedFragmentSet);
      };
    }

    return { groupedFieldSet, visitedFragmentSet };
  }

  resolveFields(parentType, groupedFieldSet, fragmentsReferencedSet = {}) {
    const fields = [];

    for (let [fieldName, fieldSet] of Object.entries(groupedFieldSet)) {
      fieldSet = fieldSet.filter(([typeCondition,]) => isTypeSubTypeOf(this.schema, parentType, typeCondition));
      if (fieldSet.length < 1) continue;

      const [,firstField] = fieldSet[0];
      const fieldType = firstField.type;

      const field = { name: fieldName, type: fieldType };

      const unmodifiedFieldType = getNamedType(fieldType);

      if (isCompositeType(unmodifiedFieldType)) {
        const { groupedFieldSet: subSelectionSet, visitedFragmentSet } = this.mergeSelectionSets(unmodifiedFieldType, fieldSet);
        field.fragmentSpreads = Object.keys(visitedFragmentSet);
        // Set union
        Object.assign(fragmentsReferencedSet, visitedFragmentSet);

        const { fields: subfields } = this.resolveFields(unmodifiedFieldType, subSelectionSet, fragmentsReferencedSet);
        field.fields = subfields;

        field.inlineFragments = this.resolveFieldsForInlineFragments(unmodifiedFieldType, subSelectionSet);
      }

      fields.push(field);
    }

    return { fields, fragmentsReferencedSet };
  }

  resolveFieldsForInlineFragments(parentType, groupedFieldSet) {
    return this.collectSubTypeConditions(parentType, groupedFieldSet).map(typeCondition => {
      const { fields } = this.resolveFields(typeCondition, groupedFieldSet);
      return { typeCondition, fields }
    });
  }

  collectSubTypeConditions(parentType, groupedFieldSet) {
    const typeConditions = new Set();
    for (const fieldSet of Object.values(groupedFieldSet)) {
      for (const [typeCondition,] of fieldSet) {
        if (!isTypeSubTypeOf(this.schema, parentType, typeCondition)) {
          typeConditions.add(typeCondition);
        }
      }
    }
    return Array.from(typeConditions);
  }

  /**
   * Extracts the root type of the operation from the schema.
   */
  rootTypeForOperation(operationDefinition) {
    switch (operationDefinition.operation) {
      case 'query':
        return this.schema.getQueryType();
      case 'mutation':
        const mutationType = this.schema.getMutationType();
        if (!mutationType) {
          throw new GraphQLError(
            'Schema is not configured for mutations',
            [operation]
          );
        }
        return mutationType;
      case 'subscription':
        const subscriptionType = this.schema.getSubscriptionType();
        if (!subscriptionType) {
          throw new GraphQLError(
            'Schema is not configured for subscriptions',
            [operation]
          );
        }
        return subscriptionType;
      default:
        throw new GraphQLError(
          'Can only compile queries, mutations and subscriptions',
          [operation]
        );
    }
  }
}

function sourceAt(location) {
  return location.source.body.slice(location.start, location.end);
}

export function printFields(fields, inlineFragments) {
  return fields && block(fields.map(field =>
    `${field.name}: ${String(field.type)}` + wrap(' ', printFields(field.fields, field.inlineFragments))
  ).concat(inlineFragments && inlineFragments.map(({ typeCondition, fields }) =>
    `... on ${String(typeCondition)}` + wrap(' ', printFields(fields)))));
}
