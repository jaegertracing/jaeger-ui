// packages/jaeger-ui/src/components/TracePage/TraceTimelineViewer/utils.bubbledError.test.js
import { getDescendantErroredSpanIDs, isErrorSpan, isErrorSpanWithContext } from './utils';

describe('isErrorSpan', () => {
  it('returns correct error info for span with error tag', () => {
    const span = { spanID: 'span-1', tags: [{ key: 'error', value: true }] };
    const result = isErrorSpan(span);
    expect(result).toEqual({ isError: true, selfError: true });
  });

  it('returns correct error info for span with error string tag', () => {
    const span = { spanID: 'span-1', tags: [{ key: 'error', value: 'true' }] };
    const result = isErrorSpan(span);
    expect(result).toEqual({ isError: true, selfError: true });
  });

  it('returns correct error info for span without error tag', () => {
    const span = { spanID: 'span-1', tags: [{ key: 'other', value: 'value' }] };
    const result = isErrorSpan(span);
    expect(result).toEqual({ isError: false, selfError: false });
  });
});

describe('isErrorSpanWithContext', () => {
  function span({ spanID, depth, tags = [] }) {
    return {
      spanID,
      depth,
      tags,
    };
  }

  it('returns correct error info for span with self error', () => {
    const spans = [
      span({ spanID: 'parent', depth: 0, tags: [] }),
      span({ spanID: 'child', depth: 1, tags: [{ key: 'error', value: true }] }),
    ];
    const result = isErrorSpanWithContext(spans, 1);
    expect(result).toEqual({ isError: true, selfError: true });
  });

  it('returns correct error info for parent with error descendant', () => {
    const spans = [
      span({ spanID: 'parent', depth: 0, tags: [] }),
      span({ spanID: 'child', depth: 1, tags: [{ key: 'error', value: true }] }),
    ];
    const result = isErrorSpanWithContext(spans, 0);
    expect(result).toEqual({ isError: true, selfError: false });
  });

  it('returns correct error info for span without errors', () => {
    const spans = [
      span({ spanID: 'parent', depth: 0, tags: [] }),
      span({ spanID: 'child', depth: 1, tags: [] }),
    ];
    const result = isErrorSpanWithContext(spans, 0);
    expect(result).toEqual({ isError: false, selfError: false });
  });
});

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
