import {
  print,
  visit,
  visitWithTypeInfo,
  typeFromAST,
  getNamedType,
  isAbstractType,
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
  getOperationRootType,
  getFieldDef
} from './utilities/graphql';

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

    const source = print(withTypenameFieldAddedWhereNeeded(this.schema, operationDefinition));

    const rootType = getOperationRootType(this.schema, operationDefinition);
    const groupedFieldSet = this.collectFields(rootType, operationDefinition.selectionSet);
    const fragmentsReferencedSet = Object.create(null);
    const fields = this.resolveFields(rootType, groupedFieldSet, fragmentsReferencedSet);

    return { operationName, variables, source, fields, fragmentsReferenced: Object.keys(fragmentsReferencedSet) };
  }

  compileFragments() {
    return this.fragments.map(this.compileFragment, this);
  }

  compileFragment(fragmentDefinition) {
    const fragmentName = fragmentDefinition.name.value;

    const source = print(withTypenameFieldAddedWhereNeeded(this.schema, fragmentDefinition));

    const fragmentType = typeFromAST(this.schema, fragmentDefinition.typeCondition);
    const groupedFieldSet = this.collectFields(fragmentType, fragmentDefinition.selectionSet);
    const fields = this.resolveFields(fragmentType, groupedFieldSet);

    return { fragmentName, source, fields };
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

          const field = getFieldDef(this.schema, parentType, selection);
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

          this.collectFields(
            isTypeSubTypeOf(this.schema, inlineFragmentType, parentType) ? inlineFragmentType : parentType,
            selection.selectionSet,
            groupedFieldSet,
            visitedFragmentSet
          );
          break;
        }
        case Kind.FRAGMENT_SPREAD: {
          const fragmentName = selection.name.value;

          const fragment = this.fragmentNamed(fragmentName);
          if (!fragment) continue;

          const typeCondition = fragment.typeCondition;
          const fragmentType = typeFromAST(this.schema, typeCondition)

          const effectiveType = isTypeSubTypeOf(this.schema, fragmentType, parentType) ? fragmentType : parentType;

          if (!visitedFragmentSet[effectiveType]) {
            visitedFragmentSet[effectiveType] = {};
          }

          if (visitedFragmentSet[effectiveType][fragmentName]) continue;
          visitedFragmentSet[effectiveType][fragmentName] = true;

          this.collectFields(
            effectiveType,
            fragment.selectionSet,
            groupedFieldSet,
            visitedFragmentSet
          );
          break;
        }
      }
    }
    return groupedFieldSet;
  }

  mergeSelectionSets(parentType, fieldSet, visitedFragmentSet) {
    const groupedFieldSet = Object.create(null);

    for (const [,field] of fieldSet) {
      const selectionSet = field.selectionSet;

      if (selectionSet) {
        this.collectFields(parentType, selectionSet, groupedFieldSet, visitedFragmentSet);
      }
    }

    return groupedFieldSet;
  }

  resolveFields(parentType, groupedFieldSet, fragmentsReferencedSet) {
    const fields = [];

    for (let [fieldName, fieldSet] of Object.entries(groupedFieldSet)) {
      fieldSet = fieldSet.filter(([typeCondition,]) => isTypeSubTypeOf(this.schema, parentType, typeCondition));
      if (fieldSet.length < 1) continue;

      const [,firstField] = fieldSet[0];
      const fieldType = firstField.type;

      const field = { name: fieldName, type: fieldType };

      const unmodifiedFieldType = getNamedType(fieldType);

      if (isCompositeType(unmodifiedFieldType)) {
        const visitedFragmentSet = Object.create(null);
        const subSelectionSet = this.mergeSelectionSets(unmodifiedFieldType, fieldSet, visitedFragmentSet);

        field.fragmentSpreads = fragmentSpreadsForType(unmodifiedFieldType, visitedFragmentSet);

        if (fragmentsReferencedSet) {
          Object.assign(fragmentsReferencedSet, ...Object.values(visitedFragmentSet));
        }

        field.fields = this.resolveFields(unmodifiedFieldType, subSelectionSet, fragmentsReferencedSet);

        field.typeConditions = this.collectSubTypes(unmodifiedFieldType, subSelectionSet).map(subType => {
          const fields = this.resolveFields(subType, subSelectionSet, fragmentsReferencedSet);
          const fragmentSpreads = fragmentSpreadsForType(subType, visitedFragmentSet);
          return { type: subType, fields, fragmentSpreads }
        });
      }

      fields.push(field);
    }

    return fields;
  }

  collectSubTypes(parentType, groupedFieldSet) {
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
}

function fragmentSpreadsForType(type, visitedFragmentSet) {
  return visitedFragmentSet[type] ? Object.keys(visitedFragmentSet[type]) : [];
}

const typenameField = { kind: Kind.FIELD, name: { kind: Kind.NAME, value: '__typename' } };

function withTypenameFieldAddedWhereNeeded(schema, ast) {
  const typeInfo = new TypeInfo(schema);

  return visit(ast, visitWithTypeInfo(typeInfo, {
    leave: {
      SelectionSet: node => {
        const parentType = typeInfo.getParentType();

        if (isAbstractType(parentType)) {
          return { ...node, selections: [typenameField, ...node.selections] };
        }
      }
    }
  }));
}

function sourceAt(location) {
  return location.source.body.slice(location.start, location.end);
}

export function printIR({ fields, typeConditions, fragmentSpreads }) {
  return fields && wrap('<', join(fragmentSpreads, ', '), '> ')
    + block(fields.map(field =>
      `${field.name}: ${String(field.type)}` + wrap(' ', printIR(field))
    ).concat(typeConditions && typeConditions.map(type =>
      `${String(typeCondition.type)}` + wrap(' ', printIR(inlineFragment)))));
}
