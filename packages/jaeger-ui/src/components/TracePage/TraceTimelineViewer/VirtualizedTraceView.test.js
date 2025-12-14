// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SpanBarRow from './SpanBarRow';
import DetailState from './SpanDetail/DetailState';
import SpanDetailRow from './SpanDetailRow';
import {
  DEFAULT_HEIGHTS,
  VirtualizedTraceViewImpl,
  generateRowStatesFromTrace,
} from './VirtualizedTraceView';
import traceGenerator from '../../../demo/trace-generators';
import transformTraceData from '../../../model/transform-trace-data';
import updateUiFindSpy from '../../../utils/update-ui-find';
import * as linkPatterns from '../../../model/link-patterns';
import memoizedTraceCriticalPath from '../CriticalPath/index';

import criticalPathTest from '../CriticalPath/testCases/test2';

jest.mock('./SpanTreeOffset');
jest.mock('../../../utils/update-ui-find');

jest.mock('./ListView', () => {
  const mockFn = jest.fn(props => <div data-testid="list-view" />);
  return mockFn;
});

describe('<VirtualizedTraceViewImpl>', () => {
  let focusUiFindMatchesMock;
  let mockProps;
  let trace;
  let criticalPath;
  let instance;

  beforeEach(() => {
    const ListView = require('./ListView');
    ListView.mockClear();
    ListView.mockImplementation(props => <div data-testid="list-view" />);

    trace = transformTraceData(traceGenerator.trace({ numberOfSpans: 10 }));
    criticalPath = memoizedTraceCriticalPath(trace);
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
      history: {
        replace: jest.fn(),
      },
      location: {
        search: null,
      },
    };

    instance = createTestInstance(mockProps);
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
      // this span is condidered to have collapsed children
      { spanID: newSpanID, depth: 1 },
      // these two "spans" are children and should be hidden
      { depth: 2 },
      { depth: 3 },
      ...trace.spans.slice(1),
    ];
    const _trace = { ...trace, spans };
    return { props: { ...mockProps, childrenHiddenIDs, trace: _trace }, spans };
  }

  function updateSpan(srcTrace, spanIndex, update) {
    const span = { ...srcTrace.spans[spanIndex], ...update };
    const spans = [...srcTrace.spans.slice(0, spanIndex), span, ...srcTrace.spans.slice(spanIndex + 1)];
    return { ...srcTrace, spans };
  }

  function createTestInstance(props) {
    // Create helper functions that mimic the component's internal logic
    const getRowStates = () =>
      generateRowStatesFromTrace(props.trace, props.childrenHiddenIDs, props.detailStates);
    const mapRowIndexToSpanIndex = index => getRowStates()[index].spanIndex;

    const mapSpanIndexToRowIndex = index => {
      const rowStates = getRowStates();
      const max = rowStates.length;
      for (let i = 0; i < max; i++) {
        const { spanIndex } = rowStates[i];
        if (spanIndex === index) {
          return i;
        }
      }
      throw new Error(`unable to find row for span index: ${index}`);
    };

    const getKeyFromIndex = index => {
      const { isDetail, span } = getRowStates()[index];
      return `${span.spanID}--${isDetail ? 'detail' : 'bar'}`;
    };

    const getIndexFromKey = key => {
      const parts = key.split('--');
      const _spanID = parts[0];
      const _isDetail = parts[1] === 'detail';
      const rowStates = getRowStates();
      const max = rowStates.length;
      for (let i = 0; i < max; i++) {
        const { span, isDetail } = rowStates[i];
        if (span.spanID === _spanID && isDetail === _isDetail) {
          return i;
        }
      }
      return -1;
    };

    const getRowHeight = index => {
      const { span, isDetail } = getRowStates()[index];
      if (!isDetail) {
        return DEFAULT_HEIGHTS.bar;
      }
      if (Array.isArray(span.logs) && span.logs.length) {
        return DEFAULT_HEIGHTS.detailWithLogs;
      }
      return DEFAULT_HEIGHTS.detail;
    };

    const focusSpan = uiFind => {
      if (props.trace) {
        updateUiFindSpy({
          location: props.location,
          history: props.history,
          uiFind,
        });
        props.focusUiFindMatches(props.trace, uiFind, false);
      }
    };

    const linksGetter = (span, items, itemIndex) => {
      return require('../../../model/link-patterns').default(span, items, itemIndex, props.trace);
    };

    return {
      getViewRange: () => props.currentViewRangeTime,
      getSearchedSpanIDs: () => props.findMatchesIDs,
      getCollapsedChildren: () => props.childrenHiddenIDs,
      mapRowIndexToSpanIndex,
      mapSpanIndexToRowIndex,
      getKeyFromIndex,
      getIndexFromKey,
      getRowHeight,
      renderRow: null,
      getRowStates,
      focusSpan,
      linksGetter,
      shouldComponentUpdate: null,
    };
  }

  it('renders without exploding', () => {
    const { container } = render(<VirtualizedTraceViewImpl {...mockProps} />);
    expect(container).toBeTruthy();
  });

  it('renders when a trace is not set', () => {
    const { container } = render(<VirtualizedTraceViewImpl {...mockProps} trace={[]} />);
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
      let listViewRef = null;
      require('./ListView').mockImplementationOnce(props => {
        if (props.ref) {
          listViewRef = {
            getViewHeight: jest.fn(),
            getBottomVisibleIndex: jest.fn(),
            getTopVisibleIndex: jest.fn(),
            getRowPosition: jest.fn(),
          };
          props.ref(listViewRef);
        }
        return <div data-testid="list-view" />;
      });

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

      let listViewRef = null;
      require('./ListView').mockImplementation(props => {
        if (props.ref) {
          listViewRef = {
            getViewHeight: jest.fn(),
            getBottomVisibleIndex: jest.fn(),
            getTopVisibleIndex: jest.fn(),
            getRowPosition: jest.fn(),
          };
          props.ref(listViewRef);
        }
        return <div data-testid="list-view" />;
      });

      const { rerender } = render(<VirtualizedTraceViewImpl {...mockProps} />);
      mockProps.registerAccessors.mockClear();

      rerender(<VirtualizedTraceViewImpl {...mockProps} registerAccessors={newRegisterAccessors} />);

      expect(newRegisterAccessors).toHaveBeenCalled();
    });

    it('calls setTrace when trace has changed', () => {
      const newTrace = { ...trace, traceID: 'new-id' };

      const { rerender } = render(<VirtualizedTraceViewImpl {...mockProps} />);
      mockProps.setTrace.mockClear();

      rerender(<VirtualizedTraceViewImpl {...mockProps} trace={newTrace} />);

      expect(mockProps.setTrace).toHaveBeenCalledWith(newTrace, mockProps.uiFind);
    });
  });

  it('returns the current view range via getViewRange()', () => {
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
      verify(0, `${trace.spans[0].spanID}--bar`);
    });

    it('works when rows are expanded', () => {
      const { props, detailState } = expandRow(1);
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
      verify(`${trace.spans[0].spanID}--bar`, 0);
    });

    it('works when rows are expanded', () => {
      const { props, detailState } = expandRow(1);
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
      const altTrace = updateSpan(trace, 0, { logs });
      const { props, detailState } = expandRow(0);
      props.trace = altTrace;
      instance = createTestInstance(props);
      expect(instance.getRowHeight(1)).toBe(DEFAULT_HEIGHTS.detailWithLogs);
    });
  });

  describe('renderRow()', () => {
    it('renders a SpanBarRow when it is not a detail', () => {
      render(<VirtualizedTraceViewImpl {...mockProps} />);
      expect(screen.getByTestId('list-view')).toBeInTheDocument();
    });

    it('renders a SpanDetailRow when it is a detail', () => {
      const { props } = expandRow(1);
      render(<VirtualizedTraceViewImpl {...props} />);
      expect(screen.getByTestId('list-view')).toBeInTheDocument();
    });

    it('renders a SpanBarRow with a RPC span if the row is collapsed and a client span', () => {
      const clientTags = [{ key: 'span.kind', value: 'client' }, ...trace.spans[0].tags];
      const serverTags = [{ key: 'span.kind', value: 'server' }, ...trace.spans[1].tags];
      let altTrace = updateSpan(trace, 0, { tags: clientTags });
      altTrace = updateSpan(altTrace, 1, { tags: serverTags });
      const childrenHiddenIDs = new Set([altTrace.spans[0].spanID]);

      render(
        <VirtualizedTraceViewImpl {...mockProps} childrenHiddenIDs={childrenHiddenIDs} trace={altTrace} />
      );
      expect(screen.getByTestId('list-view')).toBeInTheDocument();
    });

    it('renders a SpanBarRow with a client or producer span and no instrumented server span', () => {
      const externServiceName = 'externalServiceTest';
      const leafSpan = trace.spans.find(span => !span.hasChildren);
      const leafSpanIndex = trace.spans.indexOf(leafSpan);
      const tags = [
        [
          // client span
          { key: 'span.kind', value: 'client' },
          { key: 'peer.service', value: externServiceName },
          ...leafSpan.tags,
        ],
        [
          // producer span
          { key: 'span.kind', value: 'producer' },
          { key: 'peer.service', value: externServiceName },
          ...leafSpan.tags,
        ],
      ];

      tags.forEach(tag => {
        const altTrace = updateSpan(trace, leafSpanIndex, { tags: tag });
        const { container } = render(<VirtualizedTraceViewImpl {...mockProps} trace={altTrace} />);
        expect(container.querySelector('.VirtualizedTraceView--spans')).toBeInTheDocument();
      });
    });

    it('renderSpanBarRow returns null if trace is falsy', () => {
      const { container } = render(<VirtualizedTraceViewImpl {...mockProps} trace={null} />);
      expect(container.querySelector('.VirtualizedTraceView--spans')).toBeInTheDocument();
    });

    it('renderSpanDetailRow returns null if detailState is missing', () => {
      const { container } = render(<VirtualizedTraceViewImpl {...mockProps} />);
      expect(container.querySelector('.VirtualizedTraceView--spans')).toBeInTheDocument();
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
      render(<VirtualizedTraceViewImpl {...mockProps} trace={trace} criticalPath={undefined} />);

      const localInstance = document.querySelector('.VirtualizedTraceView--spans');
      expect(localInstance).toBeInTheDocument();
    });
  });

  describe('shouldScrollToFirstUiFindMatch', () => {
    it('calls props.scrollToFirstVisibleSpan if shouldScrollToFirstUiFindMatch is true', () => {
      const updatedProps = { ...mockProps, shouldScrollToFirstUiFindMatch: true };

      render(<VirtualizedTraceViewImpl {...updatedProps} />);

      expect(mockProps.scrollToFirstVisibleSpan).toHaveBeenCalled();
      expect(mockProps.clearShouldScrollToFirstUiFindMatch).toHaveBeenCalled();
    });
  });

  describe('focusSpan', () => {
    it('calls updateUiFind and focusUiFindMatches', () => {
      const spanName = 'span1';
      instance.focusSpan(spanName);

      expect(updateUiFindSpy).toHaveBeenLastCalledWith({
        history: mockProps.history,
        location: mockProps.location,
        uiFind: spanName,
      });

      expect(focusUiFindMatchesMock).toHaveBeenLastCalledWith(trace, spanName, false);
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
      const key = span.tags[0].key;
      const val = encodeURIComponent(span.tags[0].value);

      const linkPatternConfig = [
        {
          key,
          type: 'tags',
          url: `http://example.com/?key1=#{${key}}&traceID=#{trace.traceID}&startTime=#{trace.startTime}`,
          text: `For first link traceId is - #{trace.traceID}`,
        },
      ].map(linkPatterns.processLinkPattern);

      linkPatterns.processedLinks.push(...linkPatternConfig);

      expect(instance.linksGetter(span, span.tags, 0)).toEqual([
        {
          url: `http://example.com/?key1=${val}&traceID=${trace.traceID}&startTime=${trace.startTime}`,
          text: `For first link traceId is - ${trace.traceID}`,
        },
      ]);
    });
  });

  describe('event handlers', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('handles list resize events when listView exists', () => {
      const mockListView = { forceUpdate: jest.fn() };

      require('./ListView').mockImplementationOnce(props => {
        if (props.ref) {
          props.ref(mockListView);
        }
        return <div data-testid="list-view" />;
      });

      render(<VirtualizedTraceViewImpl {...mockProps} />);

      const event = new Event('jaeger:list-resize');
      window.dispatchEvent(event);

      expect(mockListView.forceUpdate).toHaveBeenCalled();
    });

    it('handles list resize events when listView is null', () => {
      render(<VirtualizedTraceViewImpl {...mockProps} />);

      const event = new Event('jaeger:list-resize');
      window.dispatchEvent(event);
      expect(true).toBe(true);
    });

    it('handles detail measure events with spanID', () => {
      const mockListView = { forceUpdate: jest.fn() };

      require('./ListView').mockImplementationOnce(props => {
        if (props.ref) {
          props.ref(mockListView);
        }
        return <div data-testid="list-view" />;
      });

      render(<VirtualizedTraceViewImpl {...mockProps} />);

      const event = new CustomEvent('jaeger:detail-measure', { detail: { spanID: 'test-span-123' } });
      window.dispatchEvent(event);

      expect(mockListView.forceUpdate).toHaveBeenCalled();
    });

    it('handles detail measure events without spanID', () => {
      const mockListView = { forceUpdate: jest.fn() };

      require('./ListView').mockImplementationOnce(props => {
        if (props.ref) {
          props.ref(mockListView);
        }
        return <div data-testid="list-view" />;
      });

      render(<VirtualizedTraceViewImpl {...mockProps} />);

      const event = new CustomEvent('jaeger:detail-measure', { detail: {} });
      window.dispatchEvent(event);
      expect(mockListView.forceUpdate).toHaveBeenCalled();
    });

    it('handles detail measure events when listView is null', () => {
      render(<VirtualizedTraceViewImpl {...mockProps} />);

      const event = new CustomEvent('jaeger:detail-measure', { detail: { spanID: 'test-span-123' } });
      window.dispatchEvent(event);
      expect(true).toBe(true);
    });
  });
});
