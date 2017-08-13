import { CompilerContext, SelectionSet, Selection } from '../';

export function mergeInFragmentSpreads(
  context: CompilerContext,
  selectionSet: SelectionSet
): SelectionSet {
  const selections: Selection[] = [];

  for (const selection of selectionSet.selections) {
    switch (selection.kind) {
      case 'FragmentSpread':
        const fragment = context.fragmentNamed(selection.fragmentName);

        // Compute the intersection.
        const possibleTypes = fragment.selectionSet.possibleTypes.filter(type =>
          selectionSet.possibleTypes.includes(type)
        );

        selections.push({
          kind: 'TypeCondition',
          type: fragment.type,
          selectionSet: mergeInFragmentSpreads(
            context,
            {
              possibleTypes,
              selections: fragment.selectionSet.selections
            }
          )
        });
        break;
      case 'TypeCondition':
      case 'BooleanCondition':
        selections.push({
          ...selection,
          selectionSet: mergeInFragmentSpreads(context, selection.selectionSet)
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
