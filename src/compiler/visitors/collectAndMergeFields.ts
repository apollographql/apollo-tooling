import { SelectionSet, Selection, Field, BooleanCondition } from '../';
import { GraphQLObjectType } from 'graphql';

// This is a temporary workaround to keep track of conditions on fields in the fields themselves.
// It is only added here because we want to expose it to the Android target, which relies on the legacy IR.
declare module '../' {
  interface Field {
    conditions?: BooleanCondition[];
  }
}

export function collectAndMergeFields(
  selectionSet: SelectionSet,
  mergeInFragmentSpreads: Boolean = true
): Field[] {
  const fieldMap: Map<string, Field> = new Map();

  function visitSelectionSet(
    selections: Selection[],
    possibleTypes: GraphQLObjectType[],
    conditions: BooleanCondition[] = []
  ) {
    if (possibleTypes.length < 1) return;

    for (const selection of selections) {
      switch (selection.kind) {
        case 'Field':
          const field = selection;
          const existingField = fieldMap.get(field.responseKey);
          if (existingField) {
            existingField.isConditional = existingField.isConditional && conditions.length > 0;

            // FIXME: This is strictly taken incorrect, because the conditions should be ORed
            // These conditions are only used in Android target however,
            // and there is now way to express this in the legacy IR.
            if (existingField.conditions && conditions.length > 0) {
              existingField.conditions = [...existingField.conditions, ...conditions];
            }

            if (field.selectionSet && existingField.selectionSet) {
              existingField.selectionSet.selections.push(
                ...wrapInBooleanConditionsIfNeeded(field.selectionSet.selections, conditions)
              );
            }
          } else {
            // Make sure to deep clone selections to avoid modifying the original field
            // TODO: Should we use an object freezing / immutability solution?
            const clonedField = {
              ...field,
              selectionSet: field.selectionSet
                ? {
                    possibleTypes: field.selectionSet.possibleTypes,
                    selections: [
                      ...wrapInBooleanConditionsIfNeeded(field.selectionSet.selections, conditions)
                    ]
                  }
                : undefined
            };

            clonedField.isConditional = conditions.length > 0;

            fieldMap.set(field.responseKey, { ...clonedField, conditions });
          }
          break;
        case 'FragmentSpread':
        case 'TypeCondition':
          if (selection.kind === 'FragmentSpread' && !mergeInFragmentSpreads) continue;

          // Only merge fragment spreads and type conditions if they match all possible types.
          if (!possibleTypes.every(type => selection.selectionSet.possibleTypes.includes(type))) continue;

          visitSelectionSet(
            selection.selectionSet.selections,
            possibleTypes,
            conditions
          );
          break;
        case 'BooleanCondition':
          visitSelectionSet(selection.selectionSet.selections, possibleTypes, [...conditions, selection]);
          break;
      }
    }
  }

  visitSelectionSet(selectionSet.selections, selectionSet.possibleTypes);

  // Replace field descriptions with type-specific descriptions if possible
  if (selectionSet.possibleTypes.length == 1) {
    const type = selectionSet.possibleTypes[0];
    const fieldDefMap = type.getFields();

    for (const [responseKey, field] of fieldMap) {
      const fieldDef = fieldDefMap[field.name];

      if (fieldDef && fieldDef.description) {
        fieldMap.set(responseKey, { ...field, description: fieldDef.description });
      }
    }
  }

  return Array.from(fieldMap.values());
}

export function wrapInBooleanConditionsIfNeeded(
  selections: Selection[],
  conditions?: BooleanCondition[]
): Selection[] {
  if (!conditions || conditions.length == 0) return selections;

  const [condition, ...rest] = conditions;
  return [
    {
      ...condition,
      selectionSet: {
        possibleTypes: condition.selectionSet.possibleTypes,
        selections: wrapInBooleanConditionsIfNeeded(selections, rest)
      }
    }
  ];
}
