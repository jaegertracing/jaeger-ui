// packages/jaeger-ui/src/components/TracePage/TraceTimelineViewer/utils.bubbledError.test.js
import { getDescendantErroredSpanIDs } from './utils';

describe('getDescendantErroredSpanIDs', () => {
  function span({ spanID, depth, tags = [] }) {
    return {
      spanID,
      depth,
      tags,
      // minimal fields not used by this util
      duration: 1,
      hasChildren: false,
      operationName: 'op',
      process: { serviceName: 'svc' },
      logs: [],
      startTime: 0,
    };
  }

  it('returns IDs of descendant spans with error tag until depth unwinds', () => {
    const spans = [
      span({ spanID: 'root', depth: 0 }),
      span({ spanID: 'parent', depth: 1 }),
      span({ spanID: 'child-ok', depth: 2 }),
      span({ spanID: 'child-err', depth: 2, tags: [{ key: 'error', value: true }] }),
      span({ spanID: 'grandchild-err', depth: 3, tags: [{ key: 'error', value: 'true' }] }),
      // depth drops back to 1 -> stop scanning descendants of parent
      span({ spanID: 'sibling-of-parent', depth: 1 }),
    ];

    const ids = getDescendantErroredSpanIDs(spans, 1);
    expect(ids).toEqual(['child-err', 'grandchild-err']);
  });

  it('returns empty when no descendants have errors', () => {
    const spans = [
      span({ spanID: 'root', depth: 0 }),
      span({ spanID: 'parent', depth: 1 }),
      span({ spanID: 'child-ok', depth: 2 }),
      span({ spanID: 'child-ok-2', depth: 2 }),
      span({ spanID: 'sibling-of-parent', depth: 1 }),
    ];
    const ids = getDescendantErroredSpanIDs(spans, 1);
    expect(ids).toEqual([]);
  });
});
