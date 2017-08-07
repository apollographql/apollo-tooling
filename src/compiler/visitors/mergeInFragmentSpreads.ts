import { SelectionSet, Selection, Fragment } from '../';

export function mergeInFragmentSpreads(
  selectionSet: SelectionSet,
  fragments: { [fragmentName: string]: Fragment }
): SelectionSet {
  const selections: Selection[] = [];

  for (const selection of selectionSet.selections) {
    switch (selection.kind) {
      case 'FragmentSpread':
        const fragment = fragments[selection.fragmentName];
        if (!fragment) {
          throw new Error(`Cannot find fragment "${selection.fragmentName}"`);
        }

        // Compute the intersection.
        const possibleTypes = fragment.selectionSet.possibleTypes.filter(type =>
          selectionSet.possibleTypes.includes(type)
        );

        selections.push({
          kind: 'TypeCondition',
          type: fragment.type,
          selectionSet: mergeInFragmentSpreads(
            {
              possibleTypes,
              selections: fragment.selectionSet.selections
            },
            fragments
          )
        });
        break;
      case 'TypeCondition':
      case 'BooleanCondition':
        selections.push({
          ...selection,
          selectionSet: mergeInFragmentSpreads(selection.selectionSet, fragments)
        });
        break;
      default:
        selections.push(selection);
        break;
    }
  }

  return {
    possibleTypes: selectionSet.possibleTypes,
    selections
  };
}
