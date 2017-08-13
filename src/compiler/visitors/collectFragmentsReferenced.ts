import { CompilerContext, SelectionSet } from '../';

export function collectFragmentsReferenced(
  context: CompilerContext,
  selectionSet: SelectionSet,
  fragmentsReferenced: Set<string> = new Set()
): Set<string> {
  for (const selection of selectionSet.selections) {
    switch (selection.kind) {
      case 'FragmentSpread':
        fragmentsReferenced.add(selection.fragmentName);

        const fragment = context.fragments[selection.fragmentName];
        if (!fragment) {
          throw new Error(`Cannot find fragment "${selection.fragmentName}"`);
        }

        collectFragmentsReferenced(context, fragment.selectionSet, fragmentsReferenced);
        break;
      case 'Field':
      case 'TypeCondition':
      case 'BooleanCondition':
        if (selection.selectionSet) {
          collectFragmentsReferenced(context, selection.selectionSet, fragmentsReferenced);
        }
        break;
    }
  }

  return fragmentsReferenced;
}
