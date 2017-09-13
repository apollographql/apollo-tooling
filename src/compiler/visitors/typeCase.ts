import { inspect } from 'util';

import { GraphQLObjectType } from 'graphql';

import { SelectionSet, Selection, FragmentSpread, BooleanCondition } from '../';
import { collectAndMergeFields, wrapInBooleanConditionsIfNeeded } from './collectAndMergeFields';

export class Variant implements SelectionSet {
  constructor(
    public possibleTypes: GraphQLObjectType[],
    public selections: Selection[] = [],
    public fragmentSpreads: FragmentSpread[] = []
  ) {}

  inspect() {
    return `${inspect(this.possibleTypes)} -> ${inspect(
      collectAndMergeFields(this, false).map(field => field.responseKey)
    )}\n`;
  }
}

export class TypeCase {
  default: Variant;
  private variantsByType: Map<GraphQLObjectType, Variant>;

  get variants(): Variant[] {
    // Unique the variants before returning them.
    return Array.from(new Set(this.variantsByType.values()));
  }

  get remainder(): Variant | undefined {
    if (this.default.possibleTypes.some(type => !this.variantsByType.has(type))) {
      return new Variant(
        this.default.possibleTypes.filter(type => !this.variantsByType.has(type)),
        this.default.selections,
        this.default.fragmentSpreads
      );
    } else {
      return undefined;
    }
  }

  get exhaustiveVariants(): Variant[] {
    const remainder = this.remainder;
    if (remainder) {
      return [...this.variants, remainder];
    } else {
      return this.variants;
    }
  }

  constructor(selectionSet: SelectionSet, private mergeInFragmentSpreads: boolean = true) {
    // We start out with a single default variant that represents all possible types of the selection set.
    this.default = new Variant(selectionSet.possibleTypes);

    this.variantsByType = new Map();

    this.visitSelectionSet(selectionSet.selections, selectionSet.possibleTypes);
  }

  private visitSelectionSet(
    selections: Selection[],
    possibleTypes: GraphQLObjectType[],
    conditions: BooleanCondition[] = []
  ) {
    if (possibleTypes.length < 1) return;

    for (const selection of selections) {
      switch (selection.kind) {
        case 'Field':
          // Add the field to all variants for the currently possible types.
          for (const variant of this.variantsFor(possibleTypes)) {
            variant.selections.push(...wrapInBooleanConditionsIfNeeded([selection], conditions));
          }
          break;
        case 'FragmentSpread':
          // Add the fragment spread to all variants variants for the currently possible types.
          for (const variant of this.variantsFor(possibleTypes)) {
            variant.fragmentSpreads.push(selection);

            if (!this.mergeInFragmentSpreads) {
              variant.selections.push(...wrapInBooleanConditionsIfNeeded([selection], conditions));
            }
          }
          if (this.mergeInFragmentSpreads) {
            this.visitSelectionSet(
              selection.selectionSet.selections,
              possibleTypes.filter(type => selection.selectionSet.possibleTypes.includes(type)),
              conditions
            );
          }
          break;
        case 'TypeCondition':
          this.visitSelectionSet(
            selection.selectionSet.selections,
            possibleTypes.filter(type => selection.selectionSet.possibleTypes.includes(type)),
            conditions
          );
          break;
        case 'BooleanCondition':
          this.visitSelectionSet(selection.selectionSet.selections, possibleTypes, [...conditions, selection]);
          break;
      }
    }
  }

  // Returns records representing a set of possible types, making sure they are disjoint with other possible types.
  // That may involve refining the existing partition (https://en.wikipedia.org/wiki/Partition_refinement)
  // with the passed in set of possible types.
  private variantsFor(possibleTypes: GraphQLObjectType[]): Variant[] {
    const variants: Variant[] = [];

    const matchesDefault = this.default.possibleTypes.every(type => possibleTypes.includes(type));

    if (matchesDefault) {
      variants.push(this.default);
    }

    // We keep a map from original records to split records. We'll then remove possible types from the
    // original record and move them to the split record.
    // This means the original record will be modified to represent the set theoretical difference between
    // the original set of possible types and the refinement set, and the split record will represent the
    // intersection.
    const splits: Map<Variant, Variant> = new Map();

    for (const type of possibleTypes) {
      let original = this.variantsByType.get(type);

      if (!original) {
        if (matchesDefault) continue;
        original = this.default;
      }

      let split = splits.get(original);
      if (!split) {
        split = new Variant([], [...original.selections], [...original.fragmentSpreads]);
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
      `  default -> ${inspect(this.default)}\n` +
      this.variants.map(variant => `  ${inspect(variant)}\n`).join('')
    );
  }
}
