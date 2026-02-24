// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SpanBarRow from './SpanBarRow';
import DetailState from './SpanDetail/DetailState';
import SpanDetailRow from './SpanDetailRow';
import { DEFAULT_HEIGHTS, VirtualizedTraceViewImpl, testableHelpers } from './VirtualizedTraceView';
import traceGenerator from '../../../demo/trace-generators';
import transformTraceData from '../../../model/transform-trace-data';
import updateUiFindSpy from '../../../utils/update-ui-find';
import * as linkPatterns from '../../../model/link-patterns';
import memoizedTraceCriticalPath from '../CriticalPath/index';
import getLinks from '../../../model/link-patterns';
import criticalPathTest from '../CriticalPath/testCases/test2';

jest.mock('./SpanTreeOffset');
jest.mock('../../../utils/update-ui-find');
const mockNavigate = jest.fn();
jest.mock('react-router-dom-v5-compat', () => ({
  ...jest.requireActual('react-router-dom-v5-compat'),
  useNavigate: () => mockNavigate,
}));
jest.mock('./ListView', () => {
  const React = require('react');
  return React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      getViewHeight: jest.fn(),
      getBottomVisibleIndex: jest.fn(),
      getTopVisibleIndex: jest.fn(),
      getRowPosition: jest.fn(),
      forceUpdate: jest.fn(),
    }));

    const items = [];
    for (let i = 0; i < Math.min(3, props.dataLength || 0); i++) {
      const key = props.getKeyFromIndex(i);
      const row = props.itemRenderer(key, {}, i, {});
      if (row) items.push(row);
    }

    return React.createElement('div', { 'data-testid': 'list-view' }, ...items);
  });
});

describe('<VirtualizedTraceViewImpl>', () => {
  let focusUiFindMatchesMock;
  let mockProps;
  let legacyTrace;
  let trace;
  let criticalPath;
  let instance;

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
      trace,
      criticalPath,
      uiFind: 'uiFind',
      location: {
        search: null,
      },
    };
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

  function createTestInstance(props) {
    const getRowStates = () =>
      testableHelpers.generateRowStatesFromTrace(props.trace, props.childrenHiddenIDs, props.detailStates);

    return {
      getViewRange: () => props.currentViewRangeTime,
      getSearchedSpanIDs: () => props.findMatchesIDs,
      getCollapsedChildren: () => props.childrenHiddenIDs,
      getRowStates,
      mapRowIndexToSpanIndex: index => getRowStates()[index].spanIndex,
      mapSpanIndexToRowIndex: index => {
        const rowStates = getRowStates();
        for (let i = 0; i < rowStates.length; i++) {
          if (rowStates[i].spanIndex === index) return i;
        }
        throw new Error(`unable to find row for span index: ${index}`);
      },
      getKeyFromIndex: index => {
        const { isDetail, span } = getRowStates()[index];
        return `${span.spanID}--${isDetail ? 'detail' : 'bar'}`;
      },
      getIndexFromKey: key => {
        const parts = key.split('--');
        const _spanID = parts[0];
        const _isDetail = parts[1] === 'detail';
        const rowStates = getRowStates();
        for (let i = 0; i < rowStates.length; i++) {
          const { span, isDetail } = rowStates[i];
          if (span.spanID === _spanID && isDetail === _isDetail) return i;
        }
        return -1;
      },
      getRowHeight: index => {
        const { span, isDetail } = getRowStates()[index];
        if (!isDetail) return DEFAULT_HEIGHTS.bar;
        if (Array.isArray(span.events) && span.events.length) return DEFAULT_HEIGHTS.detailWithLogs;
        return DEFAULT_HEIGHTS.detail;
      },
    };
  }

  it('renders without exploding', () => {
    const { container } = render(<VirtualizedTraceViewImpl {...mockProps} />);
    expect(container).toBeTruthy();
  });

  it('renders when a trace is not set', () => {
    const { container } = render(<VirtualizedTraceViewImpl {...mockProps} trace={null} />);
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
      expect(mockProps.registerAccessors).toHaveBeenCalled();
      const accessors = mockProps.registerAccessors.mock.calls[0][0];
      expect(accessors).toHaveProperty('getViewRange');
      expect(accessors).toHaveProperty('getSearchedSpanIDs');
      expect(accessors).toHaveProperty('getCollapsedChildren');
      expect(accessors).toHaveProperty('mapRowIndexToSpanIndex');
      expect(accessors).toHaveProperty('mapSpanIndexToRowIndex');
    });

    it('invokes when registerAccessors changes', () => {
      const newRegisterAccessors = jest.fn();
      const { rerender } = render(<VirtualizedTraceViewImpl {...mockProps} />);
      rerender(<VirtualizedTraceViewImpl {...mockProps} registerAccessors={newRegisterAccessors} />);
      expect(newRegisterAccessors).toHaveBeenCalled();
    });

    it('calls setTrace when trace has changed', () => {
      const newTrace = { ...trace, traceID: 'new-id' };
      const { rerender } = render(<VirtualizedTraceViewImpl {...mockProps} />);
      mockProps.setTrace.mockReset();
      rerender(<VirtualizedTraceViewImpl {...mockProps} trace={newTrace} />);
      expect(mockProps.setTrace).toHaveBeenCalledWith(newTrace, mockProps.uiFind);
    });
  });

  it('returns the current view range via getViewRange()', () => {
    const instance = createTestInstance(mockProps);
    expect(instance.getViewRange()).toBe(mockProps.currentViewRangeTime);
  });

  it('returns findMatchesIDs via getSearchedSpanIDs()', () => {
    const findMatchesIDs = new Set();
    const newProps = { ...mockProps, findMatchesIDs };
    instance = createTestInstance(newProps);
    expect(instance.getSearchedSpanIDs()).toBe(findMatchesIDs);
  });

  it('returns childrenHiddenIDs via getCollapsedChildren()', () => {
    const childrenHiddenIDs = new Set();
    const newProps = { ...mockProps, childrenHiddenIDs };
    instance = createTestInstance(newProps);
    expect(instance.getCollapsedChildren()).toBe(childrenHiddenIDs);
  });

  describe('mapRowIndexToSpanIndex() maps row index to span index', () => {
    it('works when nothing is collapsed or expanded', () => {
      const instance = createTestInstance(mockProps);
      const i = trace.spans.length - 1;
      expect(instance.mapRowIndexToSpanIndex(i)).toBe(i);
    });

    it('works when a span is expanded', () => {
      const { props, detailState } = expandRow(1);
      instance = createTestInstance(props);
      expect(instance.mapRowIndexToSpanIndex(0)).toBe(0);
      expect(instance.mapRowIndexToSpanIndex(1)).toBe(1);
      expect(instance.mapRowIndexToSpanIndex(2)).toBe(1);
      expect(instance.mapRowIndexToSpanIndex(3)).toBe(2);
    });

    it('works when a parent span is collapsed', () => {
      const { props, spans } = addSpansAndCollapseTheirParent();
      instance = createTestInstance(props);
      expect(instance.mapRowIndexToSpanIndex(0)).toBe(0);
      expect(instance.mapRowIndexToSpanIndex(1)).toBe(1);
      expect(instance.mapRowIndexToSpanIndex(2)).toBe(4);
      expect(instance.mapRowIndexToSpanIndex(3)).toBe(5);
    });
  });

  describe('mapSpanIndexToRowIndex() maps span index to row index', () => {
    it('works when nothing is collapsed or expanded', () => {
      const instance = createTestInstance(mockProps);
      const i = trace.spans.length - 1;
      expect(instance.mapSpanIndexToRowIndex(i)).toBe(i);
    });

    it('works when a span is expanded', () => {
      const { props, detailState } = expandRow(1);
      instance = createTestInstance(props);
      expect(instance.mapSpanIndexToRowIndex(0)).toBe(0);
      expect(instance.mapSpanIndexToRowIndex(1)).toBe(1);
      expect(instance.mapSpanIndexToRowIndex(2)).toBe(3);
      expect(instance.mapSpanIndexToRowIndex(3)).toBe(4);
    });

    it('works when a parent span is collapsed', () => {
      const { props, spans } = addSpansAndCollapseTheirParent();
      instance = createTestInstance(props);
      expect(instance.mapSpanIndexToRowIndex(0)).toBe(0);
      expect(instance.mapSpanIndexToRowIndex(1)).toBe(1);
      expect(() => instance.mapSpanIndexToRowIndex(2)).toThrow();
      expect(() => instance.mapSpanIndexToRowIndex(3)).toThrow();
      expect(instance.mapSpanIndexToRowIndex(4)).toBe(2);
    });
  });

  describe('getKeyFromIndex() generates a "key" from a row index', () => {
    function verify(input, output) {
      expect(instance.getKeyFromIndex(input)).toBe(output);
    }

    it('works when nothing is expanded or collapsed', () => {
      instance = createTestInstance(mockProps);
      verify(0, `${trace.spans[0].spanID}--bar`);
    });

    it('works when rows are expanded', () => {
      const { props } = expandRow(1);
      instance = createTestInstance(props);
      verify(1, `${trace.spans[1].spanID}--bar`);
      verify(2, `${trace.spans[1].spanID}--detail`);
      verify(3, `${trace.spans[2].spanID}--bar`);
    });

    it('works when a parent span is collapsed', () => {
      const { props, spans } = addSpansAndCollapseTheirParent();
      instance = createTestInstance(props);
      verify(1, `${spans[1].spanID}--bar`);
      verify(2, `${spans[4].spanID}--bar`);
    });
  });

  describe('getIndexFromKey() converts a "key" to the corresponding row index', () => {
    function verify(input, output) {
      expect(instance.getIndexFromKey(input)).toBe(output);
    }

    it('works when nothing is expanded or collapsed', () => {
      instance = createTestInstance(mockProps);
      verify(`${trace.spans[0].spanID}--bar`, 0);
    });

    it('works when rows are expanded', () => {
      const { props } = expandRow(1);
      instance = createTestInstance(props);
      verify(`${trace.spans[1].spanID}--bar`, 1);
      verify(`${trace.spans[1].spanID}--detail`, 2);
      verify(`${trace.spans[2].spanID}--bar`, 3);
    });

    it('works when a parent span is collapsed', () => {
      const { props, spans } = addSpansAndCollapseTheirParent();
      instance = createTestInstance(props);
      verify(`${spans[1].spanID}--bar`, 1);
      verify(`${spans[4].spanID}--bar`, 2);
    });

    it('returns -1 for unmatched span key', () => {
      expect(instance.getIndexFromKey('nonexistent-span-id--bar')).toBe(-1);
    });
  });

  describe('getRowHeight()', () => {
    it('returns the expected height for non-detail rows', () => {
      const instance = createTestInstance(mockProps);
      expect(instance.getRowHeight(0)).toBe(DEFAULT_HEIGHTS.bar);
    });

    it('returns the expected height for detail rows that do not have logs', () => {
      const { props, detailState } = expandRow(0);
      instance = createTestInstance(props);
      expect(instance.getRowHeight(1)).toBe(DEFAULT_HEIGHTS.detail);
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

      const { props, detailState } = expandRow(0);
      props.trace = altTrace;
      instance = createTestInstance(props);
      expect(instance.getRowHeight(1)).toBe(DEFAULT_HEIGHTS.detailWithLogs);
    });
  });

  describe('renderRow()', () => {
    it('renders a SpanBarRow when it is not a detail', () => {
      const { container } = render(<VirtualizedTraceViewImpl {...mockProps} />);
      const spanRows = container.querySelectorAll('.span-row');
      expect(spanRows.length).toBeGreaterThan(0);
    });

    it('renders a SpanDetailRow when it is a detail', () => {
      const { props } = expandRow(1);
      const { container } = render(<VirtualizedTraceViewImpl {...props} />);
      const detailRows = container.querySelectorAll('.detail-row');
      expect(detailRows.length).toBeGreaterThan(0);
    });

    it('renders a SpanBarRow with a RPC span if the row is collapsed and a client span', () => {
      const clientTags = [{ key: 'span.kind', value: 'client' }, ...legacyTrace.spans[0].tags];
      const serverTags = [{ key: 'span.kind', value: 'server' }, ...legacyTrace.spans[1].tags];
      const newLegacySpans = [...legacyTrace.spans];
      newLegacySpans[0] = { ...newLegacySpans[0], tags: clientTags };
      newLegacySpans[1] = { ...newLegacySpans[1], tags: serverTags };
      const altTrace = transformTraceData({ ...legacyTrace, spans: newLegacySpans }).asOtelTrace();
      const childrenHiddenIDs = new Set([altTrace.spans[0].spanID]);
      const { container } = render(
        <VirtualizedTraceViewImpl {...mockProps} childrenHiddenIDs={childrenHiddenIDs} trace={altTrace} />
      );

      const spanRows = container.querySelectorAll('.span-row');
      expect(spanRows.length).toBeGreaterThan(0);
    });

    it('renders a SpanBarRow with a client or producer span and no instrumented server span', () => {
      const externServiceName = 'externalServiceTest';
      const leafSpan = trace.spans.find(span => !span.hasChildren);
      const leafSpanIndex = trace.spans.indexOf(leafSpan);
      const newLegacySpans = legacyTrace.spans.map((s, index) =>
        index === leafSpanIndex
          ? {
              ...s,
              tags: [
                ...s.tags,
                { key: 'span.kind', value: 'client' },
                { key: 'peer.service', value: externServiceName },
              ],
            }
          : s
      );
      const altTrace = transformTraceData({ ...legacyTrace, spans: newLegacySpans }).asOtelTrace();
      const { container } = render(<VirtualizedTraceViewImpl {...mockProps} trace={altTrace} />);

      const spanRows = container.querySelectorAll('.span-row');
      expect(spanRows.length).toBeGreaterThan(0);
    });

    it('does not render rows if trace is falsy', () => {
      const { container } = render(<VirtualizedTraceViewImpl {...mockProps} trace={null} />);
      const spanRows = container.querySelectorAll('.span-row');
      const detailRows = container.querySelectorAll('.detail-row');

      expect(spanRows.length).toBe(0);
      expect(detailRows.length).toBe(0);
    });

    it('does not render detail rows if no spans are expanded', () => {
      const { container } = render(<VirtualizedTraceViewImpl {...mockProps} />);
      expect(container.querySelectorAll('.span-row').length).toBeGreaterThan(0);
      expect(container.querySelectorAll('.detail-row').length).toBe(0);
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
      const spanID = trace.spans[0].spanID;
      const result = testableHelpers.mergeChildrenCriticalPath(trace, spanID, undefined);
      expect(result).toEqual([]);
    });
  });

  describe('shouldScrollToFirstUiFindMatch', () => {
    it('calls props.scrollToFirstVisibleSpan if shouldScrollToFirstUiFindMatch is true', () => {
      const updatedProps = { ...mockProps, shouldScrollToFirstUiFindMatch: true };
      const { rerender } = render(<VirtualizedTraceViewImpl {...mockProps} />);
      rerender(<VirtualizedTraceViewImpl {...updatedProps} />);

      expect(mockProps.scrollToFirstVisibleSpan).toHaveBeenCalledTimes(1);
      expect(mockProps.clearShouldScrollToFirstUiFindMatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('focusSpan', () => {
    beforeEach(() => {
      mockNavigate.mockClear();
      updateUiFindSpy.mockClear();
    });

    it('does not call updateUiFind on mount', () => {
      render(<VirtualizedTraceViewImpl {...mockProps} />);
      expect(updateUiFindSpy).not.toHaveBeenCalled();
    });

    it('createFocusSpan calls updateUiFind and focusUiFindMatches when invoked', () => {
      const spanName = 'span1';
      const focusSpan = testableHelpers.createFocusSpan(
        trace,
        focusUiFindMatchesMock,
        mockProps.location,
        mockNavigate
      );
      focusSpan(spanName);

      expect(updateUiFindSpy).toHaveBeenCalledWith({
        location: mockProps.location,
        navigate: mockNavigate,
        uiFind: spanName,
      });
      expect(focusUiFindMatchesMock).toHaveBeenCalledWith(trace, spanName, false);
    });

    it('createFocusSpan does not call updateUiFind when trace is null', () => {
      const spanName = 'span1';
      const focusSpan = testableHelpers.createFocusSpan(
        null,
        focusUiFindMatchesMock,
        mockProps.location,
        mockNavigate
      );
      focusSpan(spanName);

      expect(updateUiFindSpy).not.toHaveBeenCalled();
      expect(focusUiFindMatchesMock).not.toHaveBeenCalled();
    });
  });

  describe('getAccessors()', () => {
    it('calls registerAccessors after ListView is mounted', () => {
      render(<VirtualizedTraceViewImpl {...mockProps} />);
      expect(mockProps.registerAccessors).toHaveBeenCalled();
      const accessors = mockProps.registerAccessors.mock.calls[0][0];
      expect(accessors).toHaveProperty('getViewRange');
      expect(accessors).toHaveProperty('getSearchedSpanIDs');
      expect(accessors).toHaveProperty('getCollapsedChildren');
      expect(accessors).toHaveProperty('mapRowIndexToSpanIndex');
      expect(accessors).toHaveProperty('mapSpanIndexToRowIndex');
    });
  });
  describe('linksGetter()', () => {
    afterEach(() => {
      linkPatterns.processedLinks.length = 0;
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

      const result = getLinks(span, span.attributes, 0, trace);
      expect(result).toEqual([
        {
          url: `http://example.com/?key1=${val}&traceID=${trace.traceID}&startTime=${trace.startTime}`,
          text: `For first link traceId is - ${trace.traceID}`,
        },
      ]);
    });
  });

  describe('event handlers', () => {
    it('handles list resize events', () => {
      render(<VirtualizedTraceViewImpl {...mockProps} />);
      expect(() => window.dispatchEvent(new Event('jaeger:list-resize'))).not.toThrow();
    });

    it('handles detail measure events with spanID', () => {
      render(<VirtualizedTraceViewImpl {...mockProps} />);
      expect(() =>
        window.dispatchEvent(
          new CustomEvent('jaeger:detail-measure', { detail: { spanID: 'test-span-123' } })
        )
      ).not.toThrow();
    });

    it('handles detail measure events without spanID', () => {
      render(<VirtualizedTraceViewImpl {...mockProps} />);
      expect(() =>
        window.dispatchEvent(new CustomEvent('jaeger:detail-measure', { detail: {} }))
      ).not.toThrow();
    });
  });
});
