import { inspect } from 'util';

import { GraphQLObjectType } from 'graphql';

import { SelectionSet, Selection, FragmentSpread } from '../';
import { collectAndMergeFields } from './collectAndMergeFields';

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

export function typeCaseForSelectionSet(
  selectionSet: SelectionSet,
  mergeInFragmentSpreads: boolean = true
): TypeCase {
  const typeCase = new TypeCase(selectionSet.possibleTypes);

  for (const selection of selectionSet.selections) {
    switch (selection.kind) {
      case 'Field':
        for (const variant of typeCase.disjointVariantsFor(selectionSet.possibleTypes)) {
          variant.selections.push(selection);
        }
        break;
      case 'FragmentSpread':
        if (
          typeCase.default.fragmentSpreads.some(
            fragmentSpread => fragmentSpread.fragmentName === selection.fragmentName
          )
        )
          continue;

        for (const variant of typeCase.disjointVariantsFor(selectionSet.possibleTypes)) {
          variant.fragmentSpreads.push(selection);
          if (!mergeInFragmentSpreads) {
            variant.selections.push(selection);
          }
        }
        if (mergeInFragmentSpreads) {
          for (const { possibleTypes, selections } of typeCaseForSelectionSet({
            possibleTypes: selectionSet.possibleTypes.filter(type =>
              selection.selectionSet.possibleTypes.includes(type)
            ),
            selections: selection.selectionSet.selections
          }).defaultAndVariants) {
            if (selections.length < 1) continue;
            for (const variant of typeCase.disjointVariantsFor(possibleTypes)) {
              variant.selections.push(...selections);
            }
          }
        }
        break;
      case 'TypeCondition':
        for (const { possibleTypes, selections } of typeCaseForSelectionSet({
          possibleTypes: selectionSet.possibleTypes.filter(type =>
            selection.selectionSet.possibleTypes.includes(type)
          ),
          selections: selection.selectionSet.selections
        }).defaultAndVariants) {
          if (selections.length < 1) continue;
          for (const variant of typeCase.disjointVariantsFor(possibleTypes)) {
            variant.selections.push(...selections);
          }
        }
        break;
      case 'BooleanCondition':
        for (const { possibleTypes, selections } of typeCaseForSelectionSet(selection.selectionSet)
          .defaultAndVariants) {
          for (const variant of typeCase.disjointVariantsFor(possibleTypes)) {
            if (selections.length < 1) continue;
            variant.selections.push({
              ...selection,
              selectionSet: { possibleTypes: variant.possibleTypes, selections }
            });
          }
        }
        break;
    }
  }

  return typeCase;
}

export class TypeCase {
  default: Variant;
  private variantsByType: Map<GraphQLObjectType, Variant>;

  get variants(): Variant[] {
    // Unique the variants before returning them.
    return Array.from(new Set(this.variantsByType.values()));
  }

  get defaultAndVariants(): Variant[] {
    return [this.default, ...this.variants];
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
      return [remainder, ...this.variants];
    } else {
      return this.variants;
    }
  }

  constructor(possibleTypes: GraphQLObjectType[]) {
    // We start out with a single default variant that represents all possible types of the selection set.
    this.default = new Variant(possibleTypes);

    this.variantsByType = new Map();
  }

  // Returns records representing a set of possible types, making sure they are disjoint with other possible types.
  // That may involve refining the existing partition (https://en.wikipedia.org/wiki/Partition_refinement)
  // with the passed in set of possible types.
  disjointVariantsFor(possibleTypes: GraphQLObjectType[]): Variant[] {
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
