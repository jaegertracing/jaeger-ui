// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

vi.mock('./scroll-page');

import { scrollBy, scrollTo } from './scroll-page';
import ScrollManager from './ScrollManager';
import generateRowStates from './TraceTimelineViewer/generateRowStates';

const SPAN_HEIGHT = 2;

function getTrace() {
  const spans = [];
  const spanMap = new Map();
  const trace = {
    spans,
    duration: 2000,
    startTime: 1000,
    spanMap,
    rootSpans: [],
  };
  for (let i = 0; i < 10; i++) {
    const span = { duration: 1, startTime: 1000, spanID: (i + 1).toString() };
    spans.push(span);
    spanMap.set((i + 1).toString(), span);
  }
  return trace;
}

function getAccessors() {
  return {
    getViewRange: jest.fn(() => [0, 1]),
    getSearchedSpanIDs: jest.fn(),
    getCollapsedChildren: jest.fn(),
    getViewHeight: jest.fn(() => SPAN_HEIGHT * 2),
    getBottomRowIndexVisible: jest.fn(),
    getTopRowIndexVisible: jest.fn(),
    getRowPosition: jest.fn(),
    mapRowIndexToSpanIndex: jest.fn(n => n),
    mapSpanIndexToRowIndex: jest.fn(n => n),
  };
}

describe('ScrollManager', () => {
  let trace;
  let accessors;
  let manager;

  beforeEach(() => {
    scrollBy.mockReset();
    scrollTo.mockReset();
    trace = getTrace();
    accessors = getAccessors();
    manager = new ScrollManager(trace, { scrollBy, scrollTo });
    manager.setAccessors(accessors);
  });

  it('saves the accessors', () => {
    const n = Math.random();
    manager.setAccessors(n);
    expect(manager._accessors).toBe(n);
  });

  describe('_scrollPast()', () => {
    it('throws if accessors is not set', () => {
      manager.setAccessors(null);
      expect(() => manager._scrollPast(0, 1)).toThrow('Accessors not set');
    });

    it('is a noop if an invalid rowPosition is returned by the accessors', () => {
      const oldWarn = console.warn;

      console.warn = () => {};
      manager._scrollPast(null, null);
      expect(accessors.getRowPosition.mock.calls.length).toBe(1);
      expect(accessors.getViewHeight.mock.calls.length).toBe(0);
      expect(scrollTo.mock.calls.length).toBe(0);

      console.warn = oldWarn;
    });

    it('scrolls up with direction is `-1`', () => {
      const y = 10;
      const expectTo = y - 0.5 * accessors.getViewHeight();
      accessors.getRowPosition.mockReturnValue({ y, height: SPAN_HEIGHT });
      manager._scrollPast(NaN, -1);
      expect(scrollTo.mock.calls).toEqual([[expectTo]]);
    });

    it('scrolls down with direction `1`', () => {
      const y = 10;
      const vh = accessors.getViewHeight();
      const expectTo = y + SPAN_HEIGHT - 0.5 * vh;
      accessors.getRowPosition.mockReturnValue({ y, height: SPAN_HEIGHT });
      manager._scrollPast(NaN, 1);
      expect(scrollTo.mock.calls).toEqual([[expectTo]]);
    });
  });

  describe('_scrollToVisibleSpan()', () => {
    function linkParent(childSpan, parentSpan) {
      childSpan.parentSpan = parentSpan;
      childSpan.parentSpanID = parentSpan.spanID;
    }

    let scrollPastMock;

    beforeEach(() => {
      scrollPastMock = jest.fn();
      manager._scrollPast = scrollPastMock;
    });
    it('throws if accessors is not set', () => {
      manager.setAccessors(null);
      expect(() => manager._scrollToVisibleSpan(1)).toThrow('Accessors not set');
    });
    it('exits if the trace is not set', () => {
      manager.setTrace(null);
      manager._scrollToVisibleSpan(1);
      expect(scrollPastMock.mock.calls.length).toBe(0);
    });

    it('does nothing if already at the boundary', () => {
      accessors.getTopRowIndexVisible.mockReturnValue(0);
      accessors.getBottomRowIndexVisible.mockReturnValue(trace.spans.length - 1);
      manager._scrollToVisibleSpan(-1);
      expect(scrollPastMock.mock.calls.length).toBe(0);
      manager._scrollToVisibleSpan(1);
      expect(scrollPastMock.mock.calls.length).toBe(0);
    });

    it('centers the current top or bottom span', () => {
      accessors.getTopRowIndexVisible.mockReturnValue(5);
      accessors.getBottomRowIndexVisible.mockReturnValue(5);
      manager._scrollToVisibleSpan(-1);
      expect(scrollPastMock).toHaveBeenLastCalledWith(5, -1);
      manager._scrollToVisibleSpan(1);
      expect(scrollPastMock).toHaveBeenLastCalledWith(5, 1);
    });

    it('skips spans that are out of view', () => {
      trace.spans[4].startTime = trace.startTime + trace.duration * 0.5;
      accessors.getViewRange = () => [0.4, 0.6];
      accessors.getTopRowIndexVisible.mockReturnValue(trace.spans.length - 1);
      accessors.getBottomRowIndexVisible.mockReturnValue(0);
      manager._scrollToVisibleSpan(1);
      expect(scrollPastMock).toHaveBeenLastCalledWith(4, 1);
      manager._scrollToVisibleSpan(-1);
      expect(scrollPastMock).toHaveBeenLastCalledWith(4, -1);
    });

    it('skips spans that do not match the text search', () => {
      accessors.getTopRowIndexVisible.mockReturnValue(trace.spans.length - 1);
      accessors.getBottomRowIndexVisible.mockReturnValue(0);
      accessors.getSearchedSpanIDs = () => new Set([trace.spans[4].spanID]);
      manager._scrollToVisibleSpan(1);
      expect(scrollPastMock).toHaveBeenLastCalledWith(4, 1);
      manager._scrollToVisibleSpan(-1);
      expect(scrollPastMock).toHaveBeenLastCalledWith(4, -1);
    });

    it('scrolls to boundary when scrolling away from closest spanID in findMatches', () => {
      const closetFindMatchesSpanID = 4;
      accessors.getTopRowIndexVisible.mockReturnValue(closetFindMatchesSpanID - 1);
      accessors.getBottomRowIndexVisible.mockReturnValue(closetFindMatchesSpanID + 1);
      accessors.getSearchedSpanIDs = () => new Set([trace.spans[closetFindMatchesSpanID].spanID]);

      manager._scrollToVisibleSpan(1);
      expect(scrollPastMock).toHaveBeenLastCalledWith(trace.spans.length - 1, 1);

      manager._scrollToVisibleSpan(-1);
      expect(scrollPastMock).toHaveBeenLastCalledWith(0, -1);
    });

    it('scrolls to last visible row when boundary is hidden', () => {
      const parentOfLastRowWithHiddenChildrenIndex = trace.spans.length - 2;
      const parentSpan = trace.spans[parentOfLastRowWithHiddenChildrenIndex];
      const childSpan = trace.spans[trace.spans.length - 1];

      accessors.getBottomRowIndexVisible.mockReturnValue(0);
      accessors.getCollapsedChildren = () => new Set([parentSpan.spanID]);
      accessors.getSearchedSpanIDs = () => new Set([trace.spans[0].spanID]);

      linkParent(childSpan, parentSpan);

      manager._scrollToVisibleSpan(1);
      expect(scrollPastMock).toHaveBeenLastCalledWith(parentOfLastRowWithHiddenChildrenIndex, 1);
    });

    it('scrolls to index 0 when scrolling down and index 0 is the only match', () => {
      accessors.getTopRowIndexVisible.mockReturnValue(5);
      accessors.getBottomRowIndexVisible.mockReturnValue(5);
      accessors.getSearchedSpanIDs = () => new Set([trace.spans[0].spanID]);

      manager._scrollToVisibleSpan(1, 0);
      expect(scrollPastMock).toHaveBeenLastCalledWith(0, 1);
    });

    it('scrolls to correct span when startRow is provided and mapping is not 1:1', () => {
      // Mock non-1:1 mapping: row 2 maps to span 4, and span 4 maps to row 2
      accessors.mapRowIndexToSpanIndex.mockImplementation(r => (r === 2 ? 4 : r));
      accessors.mapSpanIndexToRowIndex.mockImplementation(s => (s === 4 ? 2 : s));
      accessors.getSearchedSpanIDs = () => new Set([trace.spans[4].spanID]);

      manager._scrollToVisibleSpan(1, 2);
      expect(accessors.mapRowIndexToSpanIndex).toHaveBeenCalledWith(2);
      expect(scrollPastMock).toHaveBeenLastCalledWith(2, 1);
    });

    it('steps across a placeholder in both directions using real generateRowStates output for svc-b fixture', () => {
      const span0 = {
        spanID: 'span-0',
        depth: 0,
        hasChildren: true,
        startTime: 1000,
        duration: 2000,
        resource: { serviceName: 'svc-a' },
        status: { code: 0 },
        childSpans: [],
      };
      const span1 = {
        spanID: 'span-1',
        depth: 1,
        hasChildren: true,
        startTime: 1100,
        duration: 500,
        resource: { serviceName: 'svc-b' },
        status: { code: 0 },
        parentSpan: span0,
        childSpans: [],
      };
      const span2 = {
        spanID: 'span-2',
        depth: 2,
        hasChildren: false,
        startTime: 1200,
        duration: 300,
        resource: { serviceName: 'svc-b' },
        status: { code: 0 },
        parentSpan: span1,
        childSpans: [],
      };
      const span3 = {
        spanID: 'span-3',
        depth: 1,
        hasChildren: false,
        startTime: 1600,
        duration: 400,
        resource: { serviceName: 'svc-c' },
        status: { code: 0 },
        parentSpan: span0,
        childSpans: [],
      };
      const span4 = {
        spanID: 'span-4',
        depth: 0,
        hasChildren: false,
        startTime: 1800,
        duration: 200,
        resource: { serviceName: 'svc-c' },
        status: { code: 0 },
        childSpans: [],
      };
      span0.childSpans = [span1, span3];
      span1.childSpans = [span2];
      const spans = [span0, span1, span2, span3, span4];
      const fixtureTrace = {
        spans,
        duration: 2000,
        startTime: 1000,
        spanMap: new Map(spans.map(s => [s.spanID, s])),
      };

      // Prune svc-b (span-1 and span-2 are pruned)
      const realRows = generateRowStates(spans, new Set(), new Map(), 'inline', new Set(['svc-b']));
      expect(realRows).toHaveLength(4);
      expect(realRows[0].span.spanID).toBe('span-0');
      expect(realRows[1].span.spanID).toBe('span-3');
      expect(realRows[2].isPrunedPlaceholder).toBe(true);
      expect(realRows[3].span.spanID).toBe('span-4');

      manager.setTrace(fixtureTrace);
      accessors.getRows = () => realRows;
      accessors.getCollapsedChildren = () => new Set();

      // Step forward from root (row 0) -> span-3 (row 1)
      accessors.getTopRowIndexVisible.mockReturnValue(0);
      accessors.getBottomRowIndexVisible.mockReturnValue(0);
      manager.scrollToNextVisibleSpan();
      expect(scrollPastMock).toHaveBeenLastCalledWith(1, 1);

      // Step forward from span-3 (row 1): boundary row 1 is centered into view first
      accessors.getTopRowIndexVisible.mockReturnValue(1);
      accessors.getBottomRowIndexVisible.mockReturnValue(1);
      manager.scrollToNextVisibleSpan();
      expect(scrollPastMock).toHaveBeenLastCalledWith(1, 1);

      // Step forward from span-3 (row 1) -> placeholder (row 2)
      accessors.getTopRowIndexVisible.mockReturnValue(2);
      accessors.getBottomRowIndexVisible.mockReturnValue(2);
      manager.scrollToNextVisibleSpan();
      expect(scrollPastMock).toHaveBeenLastCalledWith(2, 1);

      // Step backward from span-4 (row 3) -> placeholder (row 2)
      accessors.getTopRowIndexVisible.mockReturnValue(3);
      accessors.getBottomRowIndexVisible.mockReturnValue(3);
      manager.scrollToPrevVisibleSpan();
      expect(scrollPastMock).toHaveBeenLastCalledWith(2, -1);

      // Step backward from placeholder (row 2): boundary row 2 is centered into view first
      accessors.getTopRowIndexVisible.mockReturnValue(2);
      accessors.getBottomRowIndexVisible.mockReturnValue(2);
      manager.scrollToPrevVisibleSpan();
      expect(scrollPastMock).toHaveBeenLastCalledWith(2, -1);

      // Step backward from span-3 (row 1): boundary row 1 is centered into view first
      accessors.getTopRowIndexVisible.mockReturnValue(1);
      accessors.getBottomRowIndexVisible.mockReturnValue(1);
      manager.scrollToPrevVisibleSpan();
      expect(scrollPastMock).toHaveBeenLastCalledWith(1, -1);
    });

    it('navigates correctly across collapse-all-then-expand-subtree sequence', () => {
      const span0 = {
        spanID: 'span-0',
        depth: 0,
        hasChildren: true,
        startTime: 1000,
        duration: 2000,
        resource: { serviceName: 'svc-a' },
        status: { code: 0 },
        childSpans: [],
      };
      const span1 = {
        spanID: 'span-1',
        depth: 1,
        hasChildren: true,
        startTime: 1100,
        duration: 1000,
        resource: { serviceName: 'svc-a' },
        status: { code: 0 },
        parentSpan: span0,
        childSpans: [],
      };
      const span2 = {
        spanID: 'span-2',
        depth: 2,
        hasChildren: false,
        startTime: 1200,
        duration: 400,
        resource: { serviceName: 'svc-a' },
        status: { code: 0 },
        parentSpan: span1,
        childSpans: [],
      };
      const span3 = {
        spanID: 'span-3',
        depth: 2,
        hasChildren: false,
        startTime: 1700,
        duration: 300,
        resource: { serviceName: 'svc-a' },
        status: { code: 0 },
        parentSpan: span1,
        childSpans: [],
      };
      const span4 = {
        spanID: 'span-4',
        depth: 2,
        hasChildren: false,
        startTime: 2000,
        duration: 200,
        resource: { serviceName: 'svc-a' },
        status: { code: 0 },
        parentSpan: span1,
        childSpans: [],
      };
      span0.childSpans = [span1];
      span1.childSpans = [span2, span3, span4];
      const allSpans = [span0, span1, span2, span3, span4];
      const traceObj = {
        spans: allSpans,
        duration: 2200,
        startTime: 1000,
        spanMap: new Map(allSpans.map(s => [s.spanID, s])),
      };

      // Focus on non-root span-1:
      const focusedSpans = [span1, span2, span3, span4];

      // "Collapse all": all parent IDs in childrenHiddenIDs
      const collapsedAll = new Set(['span-0', 'span-1']);

      // "Expand subtree on focused row (span-1)":
      // span-1 is removed from childrenHiddenIDs, but out-of-focus ancestor span-0 remains in childrenHiddenIDs
      const childrenHiddenIDs = new Set(collapsedAll);
      childrenHiddenIDs.delete('span-1');
      expect(childrenHiddenIDs.has('span-0')).toBe(true);
      expect(childrenHiddenIDs.has('span-1')).toBe(false);

      // generateRowStates builds visible rows for focused subtree:
      const rows = generateRowStates(focusedSpans, childrenHiddenIDs, new Map(), 'inline', new Set());
      expect(rows).toHaveLength(4);
      expect(rows[0].span.spanID).toBe('span-1');
      expect(rows[1].span.spanID).toBe('span-2');
      expect(rows[2].span.spanID).toBe('span-3');
      expect(rows[3].span.spanID).toBe('span-4');

      manager.setTrace(traceObj);
      accessors.getRows = () => rows;
      accessors.getCollapsedChildren = () => childrenHiddenIDs;

      // Navigate Next from span-1 (row 0) -> span-2 (row 1)
      accessors.getTopRowIndexVisible.mockReturnValue(0);
      accessors.getBottomRowIndexVisible.mockReturnValue(0);
      manager.scrollToNextVisibleSpan();
      expect(scrollPastMock).toHaveBeenLastCalledWith(1, 1);

      // Navigate Next from span-2 (row 1): brings row 1 into full view first
      accessors.getTopRowIndexVisible.mockReturnValue(1);
      accessors.getBottomRowIndexVisible.mockReturnValue(1);
      manager.scrollToNextVisibleSpan();
      expect(scrollPastMock).toHaveBeenLastCalledWith(1, 1);

      // Navigate Next to span-3 (row 2)
      accessors.getTopRowIndexVisible.mockReturnValue(2);
      accessors.getBottomRowIndexVisible.mockReturnValue(2);
      manager.scrollToNextVisibleSpan();
      expect(scrollPastMock).toHaveBeenLastCalledWith(2, 1);

      // Navigate Prev from span-4 (row 3) -> span-3 (row 2)
      accessors.getTopRowIndexVisible.mockReturnValue(3);
      accessors.getBottomRowIndexVisible.mockReturnValue(3);
      manager.scrollToPrevVisibleSpan();
      expect(scrollPastMock).toHaveBeenLastCalledWith(2, -1);

      // Navigate Prev from span-3 (row 2): brings row 2 into full view first
      accessors.getTopRowIndexVisible.mockReturnValue(2);
      accessors.getBottomRowIndexVisible.mockReturnValue(2);
      manager.scrollToPrevVisibleSpan();
      expect(scrollPastMock).toHaveBeenLastCalledWith(2, -1);

      // Navigate Prev from span-2 (row 1): brings row 1 into full view first
      accessors.getTopRowIndexVisible.mockReturnValue(1);
      accessors.getBottomRowIndexVisible.mockReturnValue(1);
      manager.scrollToPrevVisibleSpan();
      expect(scrollPastMock).toHaveBeenLastCalledWith(1, -1);
    });

    it('handles getRows edge cases including empty rows and boundaries', () => {
      accessors.getRows = () => [];
      manager._scrollToVisibleSpan(1);
      expect(scrollPastMock).not.toHaveBeenCalled();

      accessors.getRows = () => [{ span: trace.spans[0], isDetail: false }];
      accessors.getTopRowIndexVisible.mockReturnValue(0);
      manager._scrollToVisibleSpan(-1);
      expect(scrollPastMock).not.toHaveBeenCalled();

      accessors.getBottomRowIndexVisible.mockReturnValue(0);
      manager._scrollToVisibleSpan(1);
      expect(scrollPastMock).not.toHaveBeenCalled();
    });

    it('handles getRows fallback when search matches are absent ahead and boundary is a detail row', () => {
      const rows = [
        { span: trace.spans[0], isDetail: false },
        { span: trace.spans[1], isDetail: false },
        { span: trace.spans[1], isDetail: true },
      ];
      accessors.getRows = () => rows;
      accessors.getBottomRowIndexVisible.mockReturnValue(0);
      accessors.getSearchedSpanIDs = () => new Set([trace.spans[0].spanID]);

      manager._scrollToVisibleSpan(1);
      expect(scrollPastMock).toHaveBeenLastCalledWith(1, 1);
    });

    it('handles getRows fallback when boundary span has hidden ancestors', () => {
      const span0 = { spanID: 's-0', depth: 0, startTime: 1000, duration: 1000 };
      const span1 = { spanID: 's-1', depth: 1, parentSpan: span0, startTime: 1100, duration: 200 };
      const span2 = { spanID: 's-2', depth: 2, parentSpan: span1, startTime: 1200, duration: 100 };
      const rows = [
        { span: span0, isDetail: false },
        { span: span1, isDetail: false },
        { span: span2, isDetail: false },
      ];
      manager.setTrace({ spans: [span0, span1, span2], duration: 1000, startTime: 1000 });
      accessors.getRows = () => rows;
      accessors.getBottomRowIndexVisible.mockReturnValue(0);
      accessors.getCollapsedChildren = () => new Set(['s-1']);
      accessors.getSearchedSpanIDs = () => new Set(['s-0']);

      manager._scrollToVisibleSpan(1);
      expect(scrollPastMock).toHaveBeenLastCalledWith(1, 1);
    });

    it('skips hidden child rows during forward row-based scan', () => {
      const span0 = { spanID: 's-0', depth: 0, startTime: 1000, duration: 1000 };
      const span1 = { spanID: 's-1', depth: 1, parentSpan: span0, startTime: 1100, duration: 200 };
      const span2 = { spanID: 's-2', depth: 2, parentSpan: span1, startTime: 1200, duration: 100 };
      const span3 = { spanID: 's-3', depth: 1, parentSpan: span0, startTime: 1500, duration: 200 };
      const rows = [
        { span: span0, isDetail: false },
        { span: span1, isDetail: false },
        { span: span2, isDetail: false },
        { span: span3, isDetail: false },
      ];
      manager.setTrace({ spans: [span0, span1, span2, span3], duration: 1000, startTime: 1000 });
      accessors.getRows = () => rows;
      accessors.getBottomRowIndexVisible.mockReturnValue(0);
      accessors.getCollapsedChildren = () => new Set(['s-1']);
      accessors.getSearchedSpanIDs = () => new Set(['s-2', 's-3']);

      manager._scrollToVisibleSpan(1);
      expect(scrollPastMock).toHaveBeenLastCalledWith(3, 1);
    });

    it('filters rows by viewRange during row-based scan', () => {
      const spanEarly = { spanID: 's-early', depth: 0, startTime: 1000, duration: 100 };
      const spanLate = { spanID: 's-late', depth: 0, startTime: 2500, duration: 100 };
      const spanInView = { spanID: 's-in', depth: 0, startTime: 1600, duration: 200 };
      const rows = [
        { span: spanEarly, isDetail: false },
        { span: spanLate, isDetail: false },
        { span: spanInView, isDetail: false },
      ];
      manager.setTrace({ spans: [spanEarly, spanLate, spanInView], duration: 1000, startTime: 1000 });
      accessors.getRows = () => rows;
      accessors.getViewRange = () => [0.5, 0.9];
      accessors.getBottomRowIndexVisible.mockReturnValue(0);

      manager._scrollToVisibleSpan(1);
      expect(scrollPastMock).toHaveBeenLastCalledWith(2, 1);
    });

    it('handles startRow override when getRows is defined', () => {
      const rows = [
        { span: trace.spans[0], isDetail: false },
        { span: trace.spans[1], isDetail: false },
      ];
      accessors.getRows = () => rows;
      manager._scrollToVisibleSpan(1, 0);
      expect(scrollPastMock).toHaveBeenLastCalledWith(0, 1);
    });

    it('preserves boundary-row adjustment when startRow is absent to bring partially visible edge match into view', () => {
      const rows = [
        { span: trace.spans[0], isDetail: false },
        { span: trace.spans[1], isDetail: false },
        { span: trace.spans[2], isDetail: false },
        { span: trace.spans[3], isDetail: false },
        { span: trace.spans[4], isDetail: false },
      ];
      accessors.getRows = () => rows;
      accessors.getBottomRowIndexVisible.mockReturnValue(2);
      accessors.getTopRowIndexVisible.mockReturnValue(2);
      accessors.getSearchedSpanIDs = () => new Set([trace.spans[2].spanID]);

      manager._scrollToVisibleSpan(1);
      expect(scrollPastMock).toHaveBeenLastCalledWith(2, 1);

      manager._scrollToVisibleSpan(-1);
      expect(scrollPastMock).toHaveBeenLastCalledWith(2, -1);
    });

    it('skips pruned placeholders during match navigation while retaining them for ordinary navigation', () => {
      const spanA = trace.spans[0];
      const spanB = trace.spans[1];
      const rows = [
        { span: spanA, isDetail: false, spanIndex: 0 },
        {
          span: spanA,
          isDetail: false,
          spanIndex: 0,
          isPrunedPlaceholder: true,
          prunedChildrenCount: 3,
          prunedErrorCount: 0,
        },
        { span: spanB, isDetail: false, spanIndex: 1 },
      ];
      accessors.getRows = () => rows;
      accessors.getBottomRowIndexVisible.mockReturnValue(0);

      // With search active matching both spans, the placeholder carrying spanA must be skipped
      accessors.getSearchedSpanIDs = () => new Set([spanA.spanID, spanB.spanID]);
      manager._scrollToVisibleSpan(1);
      expect(scrollPastMock).toHaveBeenLastCalledWith(2, 1);

      // Without search (ordinary navigation), placeholder row 1 is retained
      accessors.getSearchedSpanIDs = () => null;
      manager._scrollToVisibleSpan(1);
      expect(scrollPastMock).toHaveBeenLastCalledWith(1, 1);
    });

    it('scrolls to index 0 when scrolling up and index 0 is the only match', () => {
      accessors.getTopRowIndexVisible.mockReturnValue(1);
      accessors.getBottomRowIndexVisible.mockReturnValue(1);
      accessors.getSearchedSpanIDs = () => new Set([trace.spans[0].spanID]);

      manager._scrollToVisibleSpan(-1);
      expect(scrollPastMock).toHaveBeenLastCalledWith(0, -1);
    });

    describe('scrollToNextVisibleSpan() and scrollToPrevVisibleSpan()', () => {
      beforeEach(() => {
        // change spans so 0 and 4 are top-level and their children are collapsed
        const spans = trace.spans;
        let parentSpan;
        for (let i = 0; i < spans.length; i++) {
          switch (i) {
            case 0:
            case 4:
              parentSpan = spans[i];
              break;
            default:
              if (parentSpan) {
                linkParent(spans[i], parentSpan);
              }
          }
        }
        // set which spans are "in-view" and which have collapsed children
        accessors.getTopRowIndexVisible.mockReturnValue(trace.spans.length - 1);
        accessors.getBottomRowIndexVisible.mockReturnValue(0);
        accessors.getCollapsedChildren.mockReturnValue(new Set([spans[0].spanID, spans[4].spanID]));
      });

      it('skips spans that are hidden because their parent is collapsed', () => {
        manager.scrollToNextVisibleSpan();
        expect(scrollPastMock).toHaveBeenLastCalledWith(4, 1);
        manager.scrollToPrevVisibleSpan();
        expect(scrollPastMock).toHaveBeenLastCalledWith(4, -1);
      });

      it('handles more than one level of ancestry', () => {
        // modify spans[2] so that it is child of spans[1] which is child of spans[0]
        const spans = trace.spans;
        // 0 is parent of 1, 1 is parent of 2
        // remove 1's link to 0 first to be clean? loop above already linked 1 to 0
        linkParent(spans[2], spans[1]);

        // 0 is collapsed. 1 is hidden. 2 is hidden.
        // next visible should be 4.

        manager.scrollToNextVisibleSpan();
        expect(scrollPastMock).toHaveBeenLastCalledWith(4, 1);
        manager.scrollToPrevVisibleSpan();
        expect(scrollPastMock).toHaveBeenLastCalledWith(4, -1);
      });
    });

    describe('scrollToFirstVisibleSpan', () => {
      beforeEach(() => {
        jest.spyOn(manager, '_scrollToVisibleSpan').mockImplementationOnce();
      });

      it('calls _scrollToVisibleSpan searching downwards from first span', () => {
        manager.scrollToFirstVisibleSpan();
        expect(manager._scrollToVisibleSpan).toHaveBeenCalledWith(1, 0);
      });
    });
  });

  describe('scrollPageDown() and scrollPageUp()', () => {
    it('scrolls by +/~ viewHeight when invoked', () => {
      manager.scrollPageDown();
      expect(scrollBy).toHaveBeenLastCalledWith(0.95 * accessors.getViewHeight(), true);
      manager.scrollPageUp();
      expect(scrollBy).toHaveBeenLastCalledWith(-0.95 * accessors.getViewHeight(), true);
    });

    it('is a no-op if _accessors or _scroller is not defined', () => {
      manager._accessors = null;
      manager.scrollPageDown();
      manager.scrollPageUp();
      expect(scrollBy.mock.calls.length).toBe(0);
      manager._accessors = accessors;
      manager._scroller = null;
      manager.scrollPageDown();
      manager.scrollPageUp();
      expect(scrollBy.mock.calls.length).toBe(0);
    });
  });

  describe('destroy()', () => {
    it('disposes', () => {
      expect(manager._trace).toBeDefined();
      expect(manager._accessors).toBeDefined();
      expect(manager._scroller).toBeDefined();
      manager.destroy();
      expect(manager._trace).not.toBeDefined();
      expect(manager._accessors).not.toBeDefined();
      expect(manager._scroller).not.toBeDefined();
    });
  });
});
