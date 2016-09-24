import {
  visit,
  visitWithTypeInfo,
  typeFromAST,
  getNamedType,
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
} from './utilities/printing.js';

// Parts of this code are adapted from graphql-js

export class CodeGenerationContext {
  constructor(schema, document) {
    this.schema = schema;
    this.typesUsedSet = new Set();

    this.fragmentMap = Object.create(null);
    for (const definition of document.definitions) {
      if (definition.kind === Kind.FRAGMENT_DEFINITION) {
        this.fragmentMap[definition.name.value] = this.augmentWithTypes(definition);
      }
    }

    this.queries = [];
    for (const definition of document.definitions) {
      if (definition.kind === Kind.OPERATION_DEFINITION) {
        const { loc, name, operation, variableDefinitions, selectionSet } = this.augmentWithTypes(definition);

        const variables = variableDefinitions.map(node => ({ name: node.variable.name.value, type: node.type }));

        const rootType = operationRootType(this.schema, operation);
        const [groupedFieldSet] = this.collectFieldsAndFragmentNames(rootType, selectionSet);
        const [fields, fragmentsUsed] = this.resolveFields(groupedFieldSet);

        this.queries.push({ operationName: name.value, variables, fields, source: sourceAt(loc), fragmentsUsed });
      }
    }

    Object.values(this.fragmentMap).forEach(({ loc, name, typeCondition, selectionSet }) => {
      const fragmentName = name.value;
      const fragmentType = typeFromAST(this.schema, typeCondition)
      const [groupedFieldSet] = this.collectFieldsAndFragmentNames(fragmentType, selectionSet);
      const [fields] = this.resolveFields(groupedFieldSet);
      this.fragmentMap[fragmentName] = { fragmentName, fields, source: sourceAt(loc) };
    });
  }

  augmentWithTypes(ast) {
    const typeInfo = new TypeInfo(this.schema);

    return visit(ast, visitWithTypeInfo(typeInfo, {
      leave: {
        VariableDefinition: node => {
          const type = typeInfo.getInputType();
          this.addUsedType(type);
          return { ...node, type };
        },
        Field: node => {
          const type = typeInfo.getType();
          this.addUsedType(type);
          return { ...node, type }
        }
      }
    }));
  }

  addUsedType(type) {
    const namedType = getNamedType(type);
    this.typesUsedSet.add(namedType);
  }

  get typesUsed() {
    return Array.from(this.typesUsedSet);
  }

  fragmentNamed(fragmentName) {
    return this.fragmentMap[fragmentName];
  }

  get fragments() {
    return Array.from(this.fragmentMap);
  }

  collectFieldsAndFragmentNames(parentType, selectionSet, groupedFieldSet = Object.create(null), visitedFragmentSet = Object.create(null)) {
    if (!isCompositeType(parentType)) {
      throw new Error('parentType should be a composite type');
    }

    for (const selection of selectionSet.selections) {
      switch (selection.kind) {
        case Kind.FIELD: {
          const fieldName = selection.name.value;
          const responseName = selection.alias ? selection.alias.value : fieldName;

          const field = parentType.getFields()[fieldName];
          if (!field) {
            throw new GraphQLError(`Cannot query field "${fieldName}" on type "${parentType.name}"`, [selection]);
          }
          const fieldType = field.type;

          if (!groupedFieldSet[responseName]) {
            groupedFieldSet[responseName] = [];
          }
          groupedFieldSet[responseName].push({ ...selection, type: fieldType });
          break;
        }
        case Kind.INLINE_FRAGMENT: {
          const typeCondition = selection.typeCondition;
          const inlineFragmentType = typeCondition ?
            typeFromAST(this.schema, typeCondition) :
            parentType;

          if (inlineFragmentType !== parentType) {
            throw new GraphQLError('Apollo iOS does not yet support polymorphic results through type conditions', [typeCondition])
          }

          this.collectFieldsAndFragmentNames(
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

          const fragment = this.fragmentMap[fragmentName];
          if (!fragment) continue;

          const typeCondition = fragment.typeCondition;
          const fragmentType = typeFromAST(this.schema, typeCondition)

          if (fragmentType !== parentType) {
            throw new GraphQLError('Apollo iOS does not yet support polymorphic results through type conditions', [typeCondition])
          }

          this.collectFieldsAndFragmentNames(
            fragmentType,
            fragment.selectionSet,
            groupedFieldSet,
            visitedFragmentSet
          );
          break;
        }
      }
    }
    return [groupedFieldSet, visitedFragmentSet];
  }

  resolveFields(groupedFieldSet) {
    let fields = [];
    let fragmentNameSet = Object.create(null);

    for (const name of Object.keys(groupedFieldSet)) {
      const fieldSet = groupedFieldSet[name];
      const type = fieldSet[0].type;
      const field = { name, type };
      const namedType = getNamedType(type);

      if (isCompositeType(namedType)) {
        const [nestedGroupedFieldSet, nestedFragmentNameSet] = this.mergeSelectionSets(namedType, fieldSet)
        fragmentNameSet = Object.assign(fragmentNameSet, nestedFragmentNameSet);
        field.fragmentsUsed = Object.keys(nestedFragmentNameSet);
        const [subfields] = this.resolveFields(nestedGroupedFieldSet);
        field.subfields = subfields;
      }

      fields.push(field);
    }

    return [fields, Object.keys(fragmentNameSet)];
  }

  mergeSelectionSets(parentType, fieldSet) {
    let groupedFieldSet = Object.create(null);
    const visitedFragmentSet = Object.create(null);

    for (const field of fieldSet) {
      const selectionSet = field.selectionSet;
      if (selectionSet) {
        this.collectFieldsAndFragmentNames(parentType, selectionSet, groupedFieldSet, visitedFragmentSet);
      };
    }

    return [groupedFieldSet, visitedFragmentSet];
  }
}

function sourceAt(location) {
  return location.source.body.slice(location.start, location.end);
}

export function printFields(fields) {
  return fields && block(fields.map((field) => {
    return `${field.name}: ${String(field.type)}` + wrap(' ', printFields(field.subfields));
  }));
}

/**
 * Extracts the root type of the operation from the schema.
 */
function operationRootType(schema, operation) {
  switch (operation) {
    case 'query':
      return schema.getQueryType();
    case 'mutation':
      const mutationType = schema.getMutationType();
      if (!mutationType) {
        throw new GraphQLError(
          'Schema is not configured for mutations',
          [operation]
        );
      }
      return mutationType;
    case 'subscription':
      const subscriptionType = schema.getSubscriptionType();
      if (!subscriptionType) {
        throw new GraphQLError(
          'Schema is not configured for subscriptions',
          [operation]
        );
      }
      return subscriptionType;
    default:
      throw new GraphQLError(
        'Can only execute queries, mutations and subscriptions',
        [operation]
      );
  }
}
