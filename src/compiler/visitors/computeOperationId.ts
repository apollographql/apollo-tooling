import { Operation, Fragment } from '../';

import { createHash } from 'crypto';

declare module '../' {
  interface Operation {
    operationId?: string;
    sourceWithFragments?: string;
  }
}

export function computeOperationId(
  operation: Operation,
  fragmentsReferenced: string[],
  fragments: { [fragmentName: string]: Fragment }
) {
  const sourceWithFragments = [
    operation.source,
    ...fragmentsReferenced.map(fragmentName => {
      return fragments[fragmentName].source;
    })
  ].join('\n');

  const hash = createHash('sha256');
  hash.update(sourceWithFragments);
  const operationId = hash.digest('hex');

  return { operationId, sourceWithFragments };
}
