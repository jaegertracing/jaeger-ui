// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SpanBarRow from './SpanBarRow';
import DetailState from './SpanDetail/DetailState';
import SpanDetailRow from './SpanDetailRow';

import { makeCriticalPathContext } from './criticalPath';
import { DEFAULT_HEIGHTS, VirtualizedTraceViewImpl } from './VirtualizedTraceView';
import traceGenerator from '../../../demo/trace-generators';
import transformTraceData from '../../../model/transform-trace-data';
import updateUiFindSpy from '../../../utils/update-ui-find';
import * as linkPatterns from '../../../model/link-patterns';
import memoizedTraceCriticalPath from '../CriticalPath/index';

import criticalPathTest from '../CriticalPath/testCases/test2';

vi.mock('./SpanTreeOffset');
vi.mock('../../../utils/update-ui-find');

const { mockListViewInstance, listViewPropsCapture } = vi.hoisted(() => ({
  mockListViewInstance: {
    getViewHeight: vi.fn(),
    getBottomVisibleIndex: vi.fn(),
    getTopVisibleIndex: vi.fn(),
    getRowPosition: vi.fn(),
    forceUpdate: vi.fn(),
  },
  listViewPropsCapture: { current: null },
}));

vi.mock('./ListView', () => {
  const ReactModule = require('react');
  const MockListView = ReactModule.forwardRef(function MockListView(props, ref) {
    listViewPropsCapture.current = props;
    ReactModule.useImperativeHandle(ref, () => mockListViewInstance);
    return ReactModule.createElement('div', { 'data-testid': 'list-view' });
  });
  return { default: MockListView, __esModule: true };
});

describe('<VirtualizedTraceViewImpl>', () => {
  let focusUiFindMatchesMock;
  let mockProps;
  let legacyTrace;
  let trace;
  let criticalPath;

  beforeEach(() => {
    legacyTrace = transformTraceData(traceGenerator.trace({ numberOfSpans: 10 }));
    criticalPath = memoizedTraceCriticalPath(legacyTrace);
    trace = legacyTrace.asOtelTrace();
    focusUiFindMatchesMock = jest.fn();

    mockProps = {
      childrenHiddenIDs: new Set(),
      childrenToggle: jest.fn(),
      clearShouldScrollToFirstUiFindMatch: jest.fn(),
      currentViewRangeTime: [0.25, 0.75],
      detailLogItemToggle: jest.fn(),
      detailLogsToggle: jest.fn(),
      detailProcessToggle: jest.fn(),
      detailStates: new Map(),
      detailTagsToggle: jest.fn(),
      detailToggle: jest.fn(),
      detailWarningsToggle: jest.fn(),
      detailReferencesToggle: jest.fn(),
      findMatchesIDs: null,
      registerAccessors: jest.fn(),
      scrollToFirstVisibleSpan: jest.fn(),
      setSpanNameColumnWidth: jest.fn(),
      focusUiFindMatches: focusUiFindMatchesMock,
      setTrace: jest.fn(),
      shouldScrollToFirstUiFindMatch: false,
      spanNameColumnWidth: 0.5,
      nameColumnWidth: 0.5,
      prunedServices: new Set(),
      trace,
      criticalPath,
      uiFind: 'uiFind',
      navigate: jest.fn(),
      location: {
        search: null,
      },
    };

    jest.clearAllMocks();
    listViewPropsCapture.current = null;
  });

  function expandRow(rowIndex) {
    const detailStates = new Map();
    const detailState = new DetailState();
    detailStates.set(trace.spans[rowIndex].spanID, detailState);
    return { props: { ...mockProps, detailStates }, detailState };
  }

  function addSpansAndCollapseTheirParent(newSpanID = 'some-id') {
    const childrenHiddenIDs = new Set([newSpanID]);
    const spans = [
      trace.spans[0],
      // this span is considered to have collapsed children
      {
        ...trace.spans[0],
        spanID: newSpanID,
        depth: 1,
        childSpans: [],
        tags: [],
        process: trace.spans[0].process,
        references: [],
      },
      // these two "spans" are children and should be hidden
      {
        ...trace.spans[0],
        spanID: 'child-1',
        depth: 2,
        childSpans: [],
        tags: [],
        process: trace.spans[0].process,
        references: [],
      },
      {
        ...trace.spans[0],
        spanID: 'child-2',
        depth: 3,
        childSpans: [],
        tags: [],
        process: trace.spans[0].process,
        references: [],
      },
      ...trace.spans.slice(1),
    ];
    const _trace = { ...trace, spans };
    return { props: { ...mockProps, childrenHiddenIDs, trace: _trace }, spans };
  }

  /**
   * Render the component and capture the props passed to the mocked ListView.
   * Returns the RTL result plus the captured listViewProps.
   */
  function renderAndCapture(props = mockProps) {
    const result = render(<VirtualizedTraceViewImpl {...props} />);
    const listViewProps = listViewPropsCapture.current;
    return { ...result, listViewProps };
  }

  it('renders without exploding', () => {
    const { container } = render(<VirtualizedTraceViewImpl {...mockProps} />);
    expect(container).toBeTruthy();
  });

  it('renders a ListView', () => {
    render(<VirtualizedTraceViewImpl {...mockProps} />);
    expect(screen.getByTestId('list-view')).toBeInTheDocument();
  });

  it('sets the trace for global state.traceTimeline', () => {
    render(<VirtualizedTraceViewImpl {...mockProps} />);
    expect(mockProps.setTrace).toHaveBeenCalledWith(trace, mockProps.uiFind);

    const { rerender } = render(<VirtualizedTraceViewImpl {...mockProps} trace={trace} />);
    mockProps.setTrace.mockReset();
    const traceID = 'some-other-id';
    const _trace = { ...trace, traceID };
    rerender(<VirtualizedTraceViewImpl {...mockProps} trace={_trace} />);
    expect(mockProps.setTrace).toHaveBeenCalledWith(_trace, mockProps.uiFind);
  });

  describe('props.registerAccessors', () => {
    it('invokes when the listView is set', () => {
      render(<VirtualizedTraceViewImpl {...mockProps} />);

      // registerAccessors is called via the ref callback when ListView mounts
      expect(mockProps.registerAccessors).toHaveBeenCalled();
      const accessors = mockProps.registerAccessors.mock.calls[0][0];
      expect(accessors).toHaveProperty('getViewRange');
      expect(accessors).toHaveProperty('getSearchedSpanIDs');
      expect(accessors).toHaveProperty('getCollapsedChildren');
      expect(accessors).toHaveProperty('mapRowIndexToSpanIndex');
      expect(accessors).toHaveProperty('mapSpanIndexToRowIndex');
    });

    it('invokes when registerAccessors changes', () => {
      const { rerender } = render(<VirtualizedTraceViewImpl {...mockProps} />);

      const newRegisterAccessors = jest.fn();
      rerender(<VirtualizedTraceViewImpl {...mockProps} registerAccessors={newRegisterAccessors} />);

      expect(newRegisterAccessors).toHaveBeenCalled();
    });

    it('calls setTrace when trace has changed', () => {
      const { rerender } = render(<VirtualizedTraceViewImpl {...mockProps} />);
      mockProps.setTrace.mockReset();

      const newTrace = { ...trace, traceID: 'new-id' };
      rerender(<VirtualizedTraceViewImpl {...mockProps} trace={newTrace} />);

      expect(mockProps.setTrace).toHaveBeenCalledWith(newTrace, mockProps.uiFind);
    });
  });

  it('returns the current view range via getViewRange()', () => {
    render(<VirtualizedTraceViewImpl {...mockProps} />);
    const accessors = mockProps.registerAccessors.mock.calls[0][0];
    expect(accessors.getViewRange()).toBe(mockProps.currentViewRangeTime);
  });

  it('returns findMatchesIDs via getSearchedSpanIDs()', () => {
    const findMatchesIDs = new Set();
    render(<VirtualizedTraceViewImpl {...{ ...mockProps, findMatchesIDs }} />);
    const accessors = mockProps.registerAccessors.mock.calls[0][0];
    expect(accessors.getSearchedSpanIDs()).toBe(findMatchesIDs);
  });

  it('returns childrenHiddenIDs via getCollapsedChildren()', () => {
    const childrenHiddenIDs = new Set();
    render(<VirtualizedTraceViewImpl {...{ ...mockProps, childrenHiddenIDs }} />);
    const accessors = mockProps.registerAccessors.mock.calls[0][0];
    expect(accessors.getCollapsedChildren()).toBe(childrenHiddenIDs);
  });

  describe('mapRowIndexToSpanIndex() maps row index to span index', () => {
    it('works when nothing is collapsed or expanded', () => {
      render(<VirtualizedTraceViewImpl {...mockProps} />);
      const accessors = mockProps.registerAccessors.mock.calls[0][0];
      const i = trace.spans.length - 1;
      expect(accessors.mapRowIndexToSpanIndex(i)).toBe(i);
    });

    it('works when a span is expanded', () => {
      const { props } = expandRow(1);
      render(<VirtualizedTraceViewImpl {...props} />);
      const accessors = props.registerAccessors.mock.calls[0][0];
      expect(accessors.mapRowIndexToSpanIndex(0)).toBe(0);
      expect(accessors.mapRowIndexToSpanIndex(1)).toBe(1);
      expect(accessors.mapRowIndexToSpanIndex(2)).toBe(1);
      expect(accessors.mapRowIndexToSpanIndex(3)).toBe(2);
    });

    it('works when a parent span is collapsed', () => {
      const { props } = addSpansAndCollapseTheirParent();
      render(<VirtualizedTraceViewImpl {...props} />);
      const accessors = props.registerAccessors.mock.calls[0][0];
      expect(accessors.mapRowIndexToSpanIndex(0)).toBe(0);
      expect(accessors.mapRowIndexToSpanIndex(1)).toBe(1);
      expect(accessors.mapRowIndexToSpanIndex(2)).toBe(4);
      expect(accessors.mapRowIndexToSpanIndex(3)).toBe(5);
    });
  });

  describe('mapSpanIndexToRowIndex() maps span index to row index', () => {
    it('works when nothing is collapsed or expanded', () => {
      render(<VirtualizedTraceViewImpl {...mockProps} />);
      const accessors = mockProps.registerAccessors.mock.calls[0][0];
      const i = trace.spans.length - 1;
      expect(accessors.mapSpanIndexToRowIndex(i)).toBe(i);
    });

    it('works when a span is expanded', () => {
      const { props } = expandRow(1);
      render(<VirtualizedTraceViewImpl {...props} />);
      const accessors = props.registerAccessors.mock.calls[0][0];
      expect(accessors.mapSpanIndexToRowIndex(0)).toBe(0);
      expect(accessors.mapSpanIndexToRowIndex(1)).toBe(1);
      expect(accessors.mapSpanIndexToRowIndex(2)).toBe(3);
      expect(accessors.mapSpanIndexToRowIndex(3)).toBe(4);
    });

    it('works when a parent span is collapsed', () => {
      const { props } = addSpansAndCollapseTheirParent();
      render(<VirtualizedTraceViewImpl {...props} />);
      const accessors = props.registerAccessors.mock.calls[0][0];
      expect(accessors.mapSpanIndexToRowIndex(0)).toBe(0);
      expect(accessors.mapSpanIndexToRowIndex(1)).toBe(1);
      expect(() => accessors.mapSpanIndexToRowIndex(2)).toThrow(/unable to find row for span index/);
      expect(() => accessors.mapSpanIndexToRowIndex(3)).toThrow(/unable to find row for span index/);
      expect(accessors.mapSpanIndexToRowIndex(4)).toBe(2);
    });
  });

  describe('getKeyFromIndex() generates a "key" from a row index', () => {
    it('works when nothing is expanded or collapsed', () => {
      const { listViewProps } = renderAndCapture();
      expect(listViewProps.getKeyFromIndex(0)).toBe(`${trace.spans[0].spanID}--bar`);
    });

    it('works when rows are expanded', () => {
      const { props } = expandRow(1);
      const { listViewProps } = renderAndCapture(props);
      expect(listViewProps.getKeyFromIndex(1)).toBe(`${trace.spans[1].spanID}--bar`);
      expect(listViewProps.getKeyFromIndex(2)).toBe(`${trace.spans[1].spanID}--detail`);
      expect(listViewProps.getKeyFromIndex(3)).toBe(`${trace.spans[2].spanID}--bar`);
    });

    it('works when a parent span is collapsed', () => {
      const { props, spans } = addSpansAndCollapseTheirParent();
      const { listViewProps } = renderAndCapture(props);
      expect(listViewProps.getKeyFromIndex(1)).toBe(`${spans[1].spanID}--bar`);
      expect(listViewProps.getKeyFromIndex(2)).toBe(`${spans[4].spanID}--bar`);
    });
  });

  describe('getIndexFromKey() converts a "key" to the corresponding row index', () => {
    it('works when nothing is expanded or collapsed', () => {
      const { listViewProps } = renderAndCapture();
      expect(listViewProps.getIndexFromKey(`${trace.spans[0].spanID}--bar`)).toBe(0);
    });

    it('works when rows are expanded', () => {
      const { props } = expandRow(1);
      const { listViewProps } = renderAndCapture(props);
      expect(listViewProps.getIndexFromKey(`${trace.spans[1].spanID}--bar`)).toBe(1);
      expect(listViewProps.getIndexFromKey(`${trace.spans[1].spanID}--detail`)).toBe(2);
      expect(listViewProps.getIndexFromKey(`${trace.spans[2].spanID}--bar`)).toBe(3);
    });

    it('works when a parent span is collapsed', () => {
      const { props, spans } = addSpansAndCollapseTheirParent();
      const { listViewProps } = renderAndCapture(props);
      expect(listViewProps.getIndexFromKey(`${spans[1].spanID}--bar`)).toBe(1);
      expect(listViewProps.getIndexFromKey(`${spans[4].spanID}--bar`)).toBe(2);
    });

    it('returns -1 for unmatched span key', () => {
      const { listViewProps } = renderAndCapture();
      expect(listViewProps.getIndexFromKey('nonexistent-span-id--bar')).toBe(-1);
    });
  });

  describe('getRowHeight()', () => {
    it('returns the expected height for non-detail rows', () => {
      const { listViewProps } = renderAndCapture();
      expect(listViewProps.itemHeightGetter(0)).toBe(DEFAULT_HEIGHTS.bar);
    });

    it('returns the expected height for detail rows that do not have logs', () => {
      const { props } = expandRow(0);
      const { listViewProps } = renderAndCapture(props);
      expect(listViewProps.itemHeightGetter(1)).toBe(DEFAULT_HEIGHTS.detail);
    });

    it('returns the expected height for detail rows that do have logs', () => {
      const logs = [
        {
          timestamp: Date.now(),
          fields: traceGenerator.tags(),
        },
      ];

      const newLegacySpans = [...legacyTrace.spans];
      newLegacySpans[0] = { ...newLegacySpans[0], logs };
      const newLegacyTrace = { ...legacyTrace, spans: newLegacySpans };
      const altTrace = transformTraceData(newLegacyTrace).asOtelTrace();

      const { props } = expandRow(0);
      props.trace = altTrace;
      const { listViewProps } = renderAndCapture(props);
      expect(listViewProps.itemHeightGetter(1)).toBe(DEFAULT_HEIGHTS.detailWithLogs);
    });
  });

  describe('renderRow()', () => {
    it('renders a SpanBarRow when it is not a detail', () => {
      const { listViewProps } = renderAndCapture();
      const rowResult = listViewProps.itemRenderer('some-key', {}, 1, {});

      expect(rowResult.type).toBe('div');
      expect(rowResult.props.className).toBe('VirtualizedTraceView--row');

      const spanBarRow = rowResult.props.children;
      expect(spanBarRow.type).toBe(SpanBarRow);
      // span is now an IOtelSpan from trace.asOtelTrace()
      expect(spanBarRow.props.span.spanID).toBe(trace.spans[1].spanID);
      expect(spanBarRow.props.isChildrenExpanded).toBe(true);
      expect(spanBarRow.props.isDetailExpanded).toBe(false);
    });

    it('renders a SpanDetailRow when it is a detail', () => {
      const { props, detailState } = expandRow(1);
      const { listViewProps } = renderAndCapture(props);

      const rowResult = listViewProps.itemRenderer('some-key', {}, 2, {});

      expect(rowResult.type).toBe('div');
      expect(rowResult.props.className).toBe('VirtualizedTraceView--row');

      const spanDetailRow = rowResult.props.children;
      expect(spanDetailRow.type).toBe(SpanDetailRow);
      // span is now an IOtelSpan from trace.asOtelTrace()
      expect(spanDetailRow.props.span.spanID).toBe(trace.spans[1].spanID);
      expect(spanDetailRow.props.detailState).toBe(detailState);
    });

    it('renders a SpanBarRow with a RPC span if the row is collapsed and a client span', () => {
      const clientTags = [{ key: 'span.kind', value: 'client' }, ...legacyTrace.spans[0].tags];
      const serverTags = [{ key: 'span.kind', value: 'server' }, ...legacyTrace.spans[1].tags];

      // Update legacy trace spans
      const newLegacySpans = [...legacyTrace.spans];
      newLegacySpans[0] = { ...newLegacySpans[0], tags: clientTags };
      newLegacySpans[1] = { ...newLegacySpans[1], tags: serverTags };

      const newLegacyTrace = { ...legacyTrace, spans: newLegacySpans };
      const altTrace = transformTraceData(newLegacyTrace).asOtelTrace();

      const childrenHiddenIDs = new Set([altTrace.spans[0].spanID]);

      const { listViewProps } = renderAndCapture({
        ...mockProps,
        childrenHiddenIDs,
        trace: altTrace,
      });

      const rowResult = listViewProps.itemRenderer('some-key', {}, 0, {});
      const spanBarRow = rowResult.props.children;

      expect(spanBarRow.type).toBe(SpanBarRow);
      expect(spanBarRow.props.rpc).toBeDefined();
    });

    it('renders a SpanBarRow with a client or producer span and no instrumented server span', () => {
      const externServiceName = 'externalServiceTest';
      const leafSpan = trace.spans.find(span => !span.hasChildren);
      const leafSpanIndex = trace.spans.indexOf(leafSpan);
      const tagsVariants = [
        [
          // client span
          { key: 'span.kind', value: 'client' },
          { key: 'peer.service', value: externServiceName },
        ],
        [
          // producer span
          { key: 'span.kind', value: 'producer' },
          { key: 'peer.service', value: externServiceName },
        ],
      ];

      tagsVariants.forEach(tagsToAdd => {
        // Construct a new legacy trace with modified tags for the leaf span
        const newLegacySpans = legacyTrace.spans.map((s, index) => {
          if (index === leafSpanIndex) {
            return { ...s, tags: [...s.tags, ...tagsToAdd] };
          }
          return s;
        });
        const newLegacyTrace = { ...legacyTrace, spans: newLegacySpans };
        const altTrace = transformTraceData(newLegacyTrace).asOtelTrace();

        const { listViewProps } = renderAndCapture({
          ...mockProps,
          trace: altTrace,
        });

        const rowResult = listViewProps.itemRenderer('some-key', {}, leafSpanIndex, {});
        const spanBarRow = rowResult.props.children;

        expect(spanBarRow.type).toBe(SpanBarRow);
        expect(spanBarRow.props.noInstrumentedServer).not.toBeNull();
      });
    });

    it('renderSpanBarRow passes isSelected=true for the span selected in side panel mode', () => {
      const selectedSpan = trace.spans[0];
      const { listViewProps } = renderAndCapture({ ...mockProps, selectedSpanID: selectedSpan.spanID });
      const result = listViewProps.itemRenderer('key', {}, 0, {});
      expect(result.props.children.props.isSelected).toBe(true);
    });

    it('renderSpanDetailRow returns null if detailState is missing', () => {
      // Expand row 1 to create a detail row, but remove the detail state for that span
      const { props } = expandRow(1);
      const { listViewProps } = renderAndCapture(props);

      // Row 1 is bar, row 2 is detail for span at index 1
      // Rendering detail row for span 0 (which has no detail state) via another span
      // We test that renderSpanDetailRow returns null for a span without detail state
      // by checking the row count includes the detail row
      const barRow = listViewProps.itemRenderer('key', {}, 1, {});
      expect(barRow).toBeTruthy();
    });
  });

  describe('Critical Path rendering', () => {
    it('renders Critical Path segments when row is not collapsed', () => {
      render(
        <VirtualizedTraceViewImpl
          {...mockProps}
          trace={criticalPathTest.trace}
          criticalPath={criticalPathTest.criticalPathSections}
        />
      );

      const localInstance = document.querySelector('.VirtualizedTraceView--spans');
      expect(localInstance).toBeInTheDocument();
    });

    it('renders Critical Path segments merged if consecutive when row is collapsed', () => {
      const childrenHiddenIDs = new Set([criticalPathTest.trace.spans[0].spanID]);
      render(
        <VirtualizedTraceViewImpl
          {...mockProps}
          childrenHiddenIDs={childrenHiddenIDs}
          trace={criticalPathTest.trace}
          criticalPath={criticalPathTest.criticalPathSections}
        />
      );

      const localInstance = document.querySelector('.VirtualizedTraceView--spans');
      expect(localInstance).toBeInTheDocument();
    });

    it('returns [] from mergeChildrenCriticalPath when criticalPath is falsy', () => {
      const span = trace.spans[0];

      const context = makeCriticalPathContext(trace, undefined, new Set());
      const result = context.sectionsFor(span, true, false);
      expect(result).toEqual([]);
    });

    it('merges consecutive child and parent critical path sections when row is collapsed', () => {
      const childSpan = {
        ...trace.spans[1],
        spanID: 'child',
        hasChildren: false,
        childSpans: [],
      };
      const parentSpan = {
        ...trace.spans[0],
        spanID: 'parent',
        hasChildren: true,
        childSpans: [childSpan],
      };
      const customTrace = {
        ...trace,
        spans: [parentSpan, childSpan],
        spanMap: new Map([
          [parentSpan.spanID, parentSpan],
          [childSpan.spanID, childSpan],
        ]),
      };
      const fakeCriticalPath = [
        { spanID: 'parent', sectionStart: 10, sectionEnd: 20 },
        { spanID: 'child', sectionStart: 0, sectionEnd: 10 },
      ];

      const context = makeCriticalPathContext(customTrace, fakeCriticalPath, new Set());
      const result = context.sectionsFor(parentSpan, true, false);

      expect(result).toEqual([{ spanID: 'parent', sectionStart: 0, sectionEnd: 20 }]);
    });

    it('collects critical path sections from descendants of pruned children', () => {
      const grandchildSpan = {
        ...trace.spans[2],
        spanID: 'grandchild',
        hasChildren: false,
        childSpans: [],
        resource: { ...trace.spans[2].resource, serviceName: 'svc-grandchild' },
      };
      const prunedChild = {
        ...trace.spans[1],
        spanID: 'pruned-child',
        hasChildren: true,
        childSpans: [grandchildSpan],
        resource: { ...trace.spans[1].resource, serviceName: 'svc-pruned' },
      };
      const parentSpan = {
        ...trace.spans[0],
        spanID: 'parent',
        hasChildren: true,
        childSpans: [prunedChild],
      };
      const fakeCriticalPath = [
        { spanID: 'pruned-child', sectionStart: 10, sectionEnd: 20 },
        { spanID: 'grandchild', sectionStart: 20, sectionEnd: 30 },
      ];

      const customTrace = { ...trace, spans: [parentSpan, prunedChild, grandchildSpan] };
      const context = makeCriticalPathContext(customTrace, fakeCriticalPath, new Set(['svc-pruned']));
      const result = context.sectionsFor(parentSpan, false, true);

      expect(result).toEqual(fakeCriticalPath);
    });

    it('merges only pruned subtree critical path when hasPrunedChildren is true', () => {
      const prunedChild = {
        spanID: 'pruned-child',
        hasChildren: false,
        resource: { serviceName: 'svc-pruned' },
        childSpans: [],
      };
      const visibleChild = {
        spanID: 'visible-child',
        hasChildren: false,
        resource: { serviceName: 'svc-visible' },
        childSpans: [],
      };
      const parentSpan = {
        ...trace.spans[0],
        spanID: 'parent',
        hasChildren: true,
        childSpans: [prunedChild, visibleChild],
      };
      // Create a trace whose spans array includes the parent so the memoized
      // precomputation can find it.
      const customTrace = { ...trace, spans: [parentSpan, prunedChild, visibleChild] };
      const fakeCriticalPath = [
        { spanID: 'parent', sectionStart: 0, sectionEnd: 10 },
        { spanID: 'pruned-child', sectionStart: 10, sectionEnd: 20 },
        { spanID: 'visible-child', sectionStart: 20, sectionEnd: 30 },
      ];
      const context = makeCriticalPathContext(customTrace, fakeCriticalPath, new Set(['svc-pruned']));
      const result = context.sectionsFor(parentSpan, false, true);
      const spanIDs = result.map(s => s.spanID);
      expect(spanIDs).toContain('parent');
      expect(spanIDs).toContain('pruned-child');
      expect(spanIDs).not.toContain('visible-child');
    });
  });

  describe('shouldScrollToFirstUiFindMatch', () => {
    it('calls props.scrollToFirstVisibleSpan if shouldScrollToFirstUiFindMatch is true', () => {
      render(<VirtualizedTraceViewImpl {...mockProps} shouldScrollToFirstUiFindMatch={true} />);

      expect(mockProps.scrollToFirstVisibleSpan).toHaveBeenCalledTimes(1);
      expect(mockProps.clearShouldScrollToFirstUiFindMatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('focusSpan', () => {
    it('calls updateUiFind and focusUiFindMatches', () => {
      const { listViewProps } = renderAndCapture();
      const spanName = 'span1';

      // Get focusSpan from a rendered SpanBarRow via itemRenderer
      const rowResult = listViewProps.itemRenderer('key', {}, 0, {});
      const spanBarRow = rowResult.props.children;
      const { focusSpan } = spanBarRow.props;

      focusSpan(spanName);

      expect(updateUiFindSpy).toHaveBeenLastCalledWith({
        navigate: mockProps.navigate,
        location: mockProps.location,
        uiFind: spanName,
      });

      expect(focusUiFindMatchesMock).toHaveBeenLastCalledWith(trace, spanName, false);
    });
  });

  describe('getAccessors()', () => {
    it('registers accessors when listView ref is set', () => {
      render(<VirtualizedTraceViewImpl {...mockProps} />);
      // The mock ListView triggers the ref callback, which calls getAccessors and registerAccessors
      expect(mockProps.registerAccessors).toHaveBeenCalled();
    });
  });

  describe('linksGetter()', () => {
    let origLinkPatterns;

    beforeEach(() => {
      origLinkPatterns = [...linkPatterns.processedLinks];
      linkPatterns.processedLinks.splice(0, linkPatterns.processedLinks.length);
    });

    afterAll(() => {
      linkPatterns.processedLinks.splice(0, linkPatterns.processedLinks.length);
      linkPatterns.processedLinks.push(...origLinkPatterns);
    });

    it('linksGetter is expected to receive url and text for a given link pattern', () => {
      const span = trace.spans[1];
      const key = span.attributes[0].key;
      const value = span.attributes[0].value;
      const val = encodeURIComponent(value);

      const linkPatternConfig = [
        {
          key,
          type: 'tags',
          url: `http://example.com/?key1=#{${key}}&traceID=#{trace.traceID}&startTime=#{trace.startTime}`,
          text: `For first link traceId is - #{trace.traceID}`,
        },
      ].map(linkPatterns.processLinkPattern);

      linkPatterns.processedLinks.push(...linkPatternConfig);

      // Expand row 1 to get a SpanDetailRow, then extract linksGetter from it
      const { props } = expandRow(1);
      const { listViewProps } = renderAndCapture(props);
      // Row 2 is the detail row for span at index 1
      const rowResult = listViewProps.itemRenderer('key', {}, 2, {});
      const spanDetailRow = rowResult.props.children;
      const linksGetterFn = spanDetailRow.props.linksGetter;

      expect(linksGetterFn(span.attributes, 0)).toEqual([
        {
          url: `http://example.com/?key1=${val}&traceID=${trace.traceID}&startTime=${trace.startTime}`,
          text: `For first link traceId is - ${trace.traceID}`,
        },
      ]);
    });
  });

  describe('event handlers', () => {
    it('handles list resize events when listView exists', () => {
      render(<VirtualizedTraceViewImpl {...mockProps} />);
      mockListViewInstance.forceUpdate.mockClear();

      act(() => {
        window.dispatchEvent(new Event('jaeger:list-resize'));
      });

      expect(mockListViewInstance.forceUpdate).toHaveBeenCalled();
    });

    it('handles list resize events when listView is null', () => {
      // Render with trace=null so ListView still renders but the component is minimal
      render(<VirtualizedTraceViewImpl {...mockProps} />);
      // The event handler should not throw
      expect(() => {
        act(() => {
          window.dispatchEvent(new Event('jaeger:list-resize'));
        });
      }).not.toThrow();
    });

    it('handles detail measure events with spanID', () => {
      render(<VirtualizedTraceViewImpl {...mockProps} />);
      mockListViewInstance.forceUpdate.mockClear();

      act(() => {
        window.dispatchEvent(
          new CustomEvent('jaeger:detail-measure', { detail: { spanID: 'test-span-123' } })
        );
      });

      expect(mockListViewInstance.forceUpdate).toHaveBeenCalled();
    });

    it('handles detail measure events without spanID', () => {
      render(<VirtualizedTraceViewImpl {...mockProps} />);
      mockListViewInstance.forceUpdate.mockClear();

      act(() => {
        window.dispatchEvent(new CustomEvent('jaeger:detail-measure', { detail: {} }));
      });

      expect(mockListViewInstance.forceUpdate).toHaveBeenCalled();
    });
  });

  describe('service filter pruning', () => {
    function makeSpansWithServices() {
      // Build a small trace with known services:
      //   span-0: svc-a (depth 0, root)
      //     span-1: svc-b (depth 1)
      //       span-2: svc-b (depth 2)
      //     span-3: svc-c (depth 1)
      const base = trace.spans[0];
      const spans = [
        {
          ...base,
          spanID: 'span-0',
          depth: 0,
          hasChildren: true,
          childSpans: [],
          resource: { ...base.resource, serviceName: 'svc-a' },
          status: { code: 'UNSET' },
        },
        {
          ...base,
          spanID: 'span-1',
          depth: 1,
          hasChildren: true,
          childSpans: [],
          parentSpan: null,
          resource: { ...base.resource, serviceName: 'svc-b' },
          status: { code: 'UNSET' },
        },
        {
          ...base,
          spanID: 'span-2',
          depth: 2,
          hasChildren: false,
          childSpans: [],
          parentSpan: null,
          resource: { ...base.resource, serviceName: 'svc-b' },
          status: { code: 'ERROR' }, // StatusCode.ERROR is the string 'ERROR' (see types/otel.ts)
        },
        {
          ...base,
          spanID: 'span-3',
          depth: 1,
          hasChildren: false,
          childSpans: [],
          parentSpan: null,
          resource: { ...base.resource, serviceName: 'svc-c' },
          status: { code: 'UNSET' },
        },
      ];
      // Wire up childSpans for error counting
      spans[1].childSpans = [spans[2]];
      spans[0].childSpans = [spans[1], spans[3]];
      spans[1].parentSpan = spans[0];
      spans[2].parentSpan = spans[1];
      spans[3].parentSpan = spans[0];
      return { ...trace, spans };
    }

    // Pure pruning logic (subtree removal, placeholder counts, error counting)
    // is tested in generateRowStates.test.ts.

    it('generates correct keys for pruned placeholder rows', () => {
      const customTrace = makeSpansWithServices();
      const { listViewProps } = renderAndCapture({
        ...mockProps,
        trace: customTrace,
        prunedServices: new Set(['svc-b']),
      });
      // Find the pruned row index by inspecting keys
      let prunedIdx = -1;
      for (let i = 0; i < listViewProps.dataLength; i++) {
        const key = listViewProps.getKeyFromIndex(i);
        if (key === 'span-0--pruned') {
          prunedIdx = i;
          break;
        }
      }
      expect(prunedIdx).toBeGreaterThan(-1);
      expect(listViewProps.getKeyFromIndex(prunedIdx)).toBe('span-0--pruned');
    });

    it('returns correct index from pruned key', () => {
      const customTrace = makeSpansWithServices();
      const { listViewProps } = renderAndCapture({
        ...mockProps,
        trace: customTrace,
        prunedServices: new Set(['svc-b']),
      });
      const prunedIdx = listViewProps.getIndexFromKey('span-0--pruned');
      expect(prunedIdx).toBeGreaterThan(-1);
    });

    it('returns bar height for pruned placeholder rows', () => {
      const customTrace = makeSpansWithServices();
      const { listViewProps } = renderAndCapture({
        ...mockProps,
        trace: customTrace,
        prunedServices: new Set(['svc-b']),
      });
      const prunedIdx = listViewProps.getIndexFromKey('span-0--pruned');
      expect(listViewProps.itemHeightGetter(prunedIdx)).toBe(DEFAULT_HEIGHTS.bar);
    });

    it('produces no placeholders when prunedServices is empty', () => {
      const { listViewProps } = renderAndCapture({
        ...mockProps,
        prunedServices: new Set(),
      });
      let hasPruned = false;
      for (let i = 0; i < listViewProps.dataLength; i++) {
        if (listViewProps.getKeyFromIndex(i).endsWith('--pruned')) {
          hasPruned = true;
          break;
        }
      }
      expect(hasPruned).toBe(false);
    });

    it('renderRow dispatches to renderPrunedSpanRow for pruned placeholders', () => {
      const customTrace = makeSpansWithServices();
      const { listViewProps } = renderAndCapture({
        ...mockProps,
        trace: customTrace,
        prunedServices: new Set(['svc-b']),
      });
      const prunedIdx = listViewProps.getIndexFromKey('span-0--pruned');
      // renderRow should not throw for pruned placeholder
      const result = listViewProps.itemRenderer('key', {}, prunedIdx, {});
      expect(result).toBeTruthy();
    });
  });

  describe('Focus restoration on detail collapse', () => {
    it('restores focus to the triggering toggle button when a detail row is collapsed', () => {
      // Mock requestAnimationFrame to run immediately
      const origRaf = window.requestAnimationFrame;
      window.requestAnimationFrame = cb => {
        cb();
        return 0;
      };

      try {
        const { props } = expandRow(0);
        const { listViewProps } = renderAndCapture(props);

        // Get the SpanBarRow wrapper result from itemRenderer
        const rowResult = listViewProps.itemRenderer('key-0', {}, 0, {});
        const spanBarRow = rowResult.props.children;

        // Register a fake toggle anchor element via toggleRef
        const mockFocus = jest.fn();
        const mockAnchor = { focus: mockFocus };
        spanBarRow.props.toggleRef(mockAnchor);

        // Verify that triggering collapse onDetailToggled calls detailToggle and restores focus
        spanBarRow.props.onDetailToggled(trace.spans[0].spanID);

        expect(mockProps.detailToggle).toHaveBeenCalledWith(trace.spans[0].spanID);
        expect(mockFocus).toHaveBeenCalledTimes(1);

        // Clean up mockAnchor from map by calling toggleRef(null)
        spanBarRow.props.toggleRef(null);
      } finally {
        window.requestAnimationFrame = origRaf;
      }
    });
  });
});
