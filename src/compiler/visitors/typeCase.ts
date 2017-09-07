import { inspect } from 'util';

import { GraphQLObjectType } from 'graphql';

import { SelectionSet, BooleanCondition } from '../';
import { collectAndMergeFields, wrapInBooleanConditionsIfNeeded } from './collectAndMergeFields';

export class TypeCase {
  default: SelectionSet;
  private variantsByType: Map<GraphQLObjectType, SelectionSet>;

  get variants(): SelectionSet[] {
    // Unique the variants before returning them.
    return Array.from(new Set(this.variantsByType.values()));
  }

  get remainder(): SelectionSet | undefined {
    if (this.default.possibleTypes.some(type => !this.variantsByType.has(type))) {
      return {
        possibleTypes: this.default.possibleTypes.filter(type => !this.variantsByType.has(type)),
        selections: this.default.selections
      };
    } else {
      return undefined;
    }
  }

  get exhaustiveVariants(): SelectionSet[] {
    const remainder = this.remainder;
    if (remainder) {
      return [...this.variants, remainder];
    } else {
      return this.variants;
    }
  }

  constructor(selectionSet: SelectionSet) {
    // We start out with a single default variant that represents all possible types of the selection set.
    this.default = { possibleTypes: selectionSet.possibleTypes, selections: [] };

    this.variantsByType = new Map();

    this.visitSelectionSet(selectionSet);
  }

  private visitSelectionSet(selectionSet: SelectionSet, conditions: BooleanCondition[] = []) {
    for (const selection of selectionSet.selections) {
      switch (selection.kind) {
        case 'Field':
        case 'FragmentSpread':
          // Add the field to all variants that include the possible types of the selection set.
          for (const variant of this.variantsFor(selectionSet.possibleTypes)) {
            variant.selections.push(...wrapInBooleanConditionsIfNeeded([selection], conditions));
          }
          break;
        case 'TypeCondition':
          if (!selection.selectionSet.possibleTypes.some(type => selectionSet.possibleTypes.includes(type)))
            continue;
          this.visitSelectionSet(selection.selectionSet, conditions);
          break;
        case 'BooleanCondition':
          this.visitSelectionSet(selection.selectionSet, [selection, ...conditions]);
          break;
      }
    }
  }

  // Returns records representing a set of possible types, making sure they are disjoint with other possible types.
  // That may involve refining the existing partition (https://en.wikipedia.org/wiki/Partition_refinement)
  // with the passed in set of possible types.
  private variantsFor(possibleTypes: GraphQLObjectType[]): SelectionSet[] {
    const variants: SelectionSet[] = [];

    const matchesDefault = this.default.possibleTypes.every(type => possibleTypes.includes(type));

    if (matchesDefault) {
      variants.push(this.default);
    }

    // We keep a map from original records to split records. We'll then remove possible types from the
    // original record and move them to the split record.
    // This means the original record will be modified to represent the set theoretical difference between
    // the original set of possible types and the refinement set, and the split record will represent the
    // intersection.
    const splits: Map<SelectionSet, SelectionSet> = new Map();

    for (const type of possibleTypes) {
      let original = this.variantsByType.get(type);

      if (!original) {
        if (matchesDefault) continue;
        original = this.default;
      }

      let split = splits.get(original);
      if (!split) {
        split = { possibleTypes: [], selections: [...original.selections] };
        splits.set(original, split);
        variants.push(split);
      }

      if (original !== this.default) {
        original.possibleTypes.splice(original.possibleTypes.indexOf(type), 1);
      }

      this.variantsByType.set(type, split);
      split.possibleTypes.push(type);
    }

    return variants;
  }

  inspect() {
    return (
      `TypeCase\n` +
      `  default -> ${inspect(collectAndMergeFields(this.default).map(field => field.responseKey))}\n` +
      this.variants
        .map(
          variant =>
            `  ${inspect(variant.possibleTypes)} -> ${inspect(
              collectAndMergeFields(variant).map(field => field.responseKey)
            )}\n`
        )
        .join('')
    );
  }
}
