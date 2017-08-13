import { CompilerContext, Operation } from '../';
import { collectFragmentsReferenced } from './collectFragmentsReferenced';
import { createHash } from 'crypto';

export function generateOperationId(
  context: CompilerContext,
  operation: Operation,
  fragmentsReferenced?: Iterable<string>,
) {
  if (!fragmentsReferenced) {
    fragmentsReferenced = collectFragmentsReferenced(context, operation.selectionSet);
  }

  const sourceWithFragments = [
    operation.source,
    ...Array.from(fragmentsReferenced).map(fragmentName => {
      return context.fragments[fragmentName].source;
    })
  ].join('\n');

  const hash = createHash('sha256');
  hash.update(sourceWithFragments);
  const operationId = hash.digest('hex');

  return { operationId, sourceWithFragments };
}
