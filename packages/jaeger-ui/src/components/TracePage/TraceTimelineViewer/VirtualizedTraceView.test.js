// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SpanBarRow from './SpanBarRow';
import DetailState from './SpanDetail/DetailState';
import SpanDetailRow from './SpanDetailRow';
import { DEFAULT_HEIGHTS, VirtualizedTraceViewImpl } from './VirtualizedTraceView';
import traceGenerator from '../../../demo/trace-generators';
import transformTraceData from '../../../model/transform-trace-data';
import updateUiFindSpy from '../../../utils/update-ui-find';
import * as linkPatterns from '../../../model/link-patterns';
import memoizedTraceCriticalPath from '../CriticalPath/index';

import criticalPathTest from '../CriticalPath/testCases/test2';

jest.mock('./SpanTreeOffset');
jest.mock('../../../utils/update-ui-find');

jest.mock('./ListView', () => {
  return jest.fn(props => <div data-testid="list-view" />);
});

describe('<VirtualizedTraceViewImpl>', () => {
  let focusUiFindMatchesMock;
  let mockProps;
  let trace;
  let criticalPath;
  let instance;

  beforeEach(() => {
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

    // eslint-disable-next-line no-use-before-define
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
    const virtualizedTraceView = new VirtualizedTraceViewImpl(props);

    return {
      getViewRange: virtualizedTraceView.getViewRange,
      getSearchedSpanIDs: virtualizedTraceView.getSearchedSpanIDs,
      getCollapsedChildren: virtualizedTraceView.getCollapsedChildren,
      mapRowIndexToSpanIndex: virtualizedTraceView.mapRowIndexToSpanIndex,
      mapSpanIndexToRowIndex: virtualizedTraceView.mapSpanIndexToRowIndex,
      getKeyFromIndex: virtualizedTraceView.getKeyFromIndex,
      getIndexFromKey: virtualizedTraceView.getIndexFromKey,
      getRowHeight: virtualizedTraceView.getRowHeight,
      renderRow: virtualizedTraceView.renderRow,
      getRowStates: () => virtualizedTraceView.getRowStates(),
      focusSpan: virtualizedTraceView.focusSpan,
      linksGetter: virtualizedTraceView.linksGetter,
      shouldComponentUpdate: virtualizedTraceView.shouldComponentUpdate,
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
      const lv = {
        getViewHeight: jest.fn(),
        getBottomVisibleIndex: jest.fn(),
        getTopVisibleIndex: jest.fn(),
        getRowPosition: jest.fn(),
      };

      const traceView = new VirtualizedTraceViewImpl(mockProps);
      traceView.setListView(lv);

      expect(mockProps.registerAccessors).toHaveBeenCalled();
      const accessors = mockProps.registerAccessors.mock.calls[0][0];
      expect(accessors).toHaveProperty('getViewRange');
      expect(accessors).toHaveProperty('getSearchedSpanIDs');
      expect(accessors).toHaveProperty('getCollapsedChildren');
      expect(accessors).toHaveProperty('mapRowIndexToSpanIndex');
      expect(accessors).toHaveProperty('mapSpanIndexToRowIndex');
    });

    it('invokes when registerAccessors changes', () => {
      const lv = {
        getViewHeight: jest.fn(),
        getBottomVisibleIndex: jest.fn(),
        getTopVisibleIndex: jest.fn(),
        getRowPosition: jest.fn(),
      };

      const traceView = new VirtualizedTraceViewImpl(mockProps);
      traceView.setListView(lv);

      const newRegisterAccessors = jest.fn();
      traceView.props = { ...mockProps, registerAccessors: newRegisterAccessors };
      traceView.componentDidUpdate(mockProps);

      expect(newRegisterAccessors).toHaveBeenCalled();
    });

    it('calls setTrace when trace has changed', () => {
      const prevProps = { ...mockProps };
      const newTrace = { ...trace, traceID: 'new-id' };
      const updatedProps = { ...mockProps, trace: newTrace };

      const component = new VirtualizedTraceViewImpl(updatedProps);
      component.listView = {};
      component.componentDidUpdate(prevProps);

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
      instance = createTestInstance(mockProps);
      const rowResult = instance.renderRow('some-key', {}, 1, {});

      expect(rowResult.type).toBe('div');
      expect(rowResult.props.className).toBe('VirtualizedTraceView--row');

      const spanBarRow = rowResult.props.children;
      expect(spanBarRow.type).toBe(SpanBarRow);
      expect(spanBarRow.props.span).toBe(trace.spans[1]);
      expect(spanBarRow.props.isChildrenExpanded).toBe(true);
      expect(spanBarRow.props.isDetailExpanded).toBe(false);
    });

    it('renders a SpanDetailRow when it is a detail', () => {
      const { props, detailState } = expandRow(1);
      instance = createTestInstance(props);

      const rowResult = instance.renderRow('some-key', {}, 2, {});

      expect(rowResult.type).toBe('div');
      expect(rowResult.props.className).toBe('VirtualizedTraceView--row');

      const spanDetailRow = rowResult.props.children;
      expect(spanDetailRow.type).toBe(SpanDetailRow);
      expect(spanDetailRow.props.span).toBe(trace.spans[1]);
      expect(spanDetailRow.props.detailState).toBe(detailState);
    });

    it('renders a SpanBarRow with a RPC span if the row is collapsed and a client span', () => {
      const clientTags = [{ key: 'span.kind', value: 'client' }, ...trace.spans[0].tags];
      const serverTags = [{ key: 'span.kind', value: 'server' }, ...trace.spans[1].tags];
      let altTrace = updateSpan(trace, 0, { tags: clientTags });
      altTrace = updateSpan(altTrace, 1, { tags: serverTags });
      const childrenHiddenIDs = new Set([altTrace.spans[0].spanID]);

      instance = createTestInstance({
        ...mockProps,
        childrenHiddenIDs,
        trace: altTrace,
      });

      const rowResult = instance.renderRow('some-key', {}, 0, {});
      const spanBarRow = rowResult.props.children;

      expect(spanBarRow.type).toBe(SpanBarRow);
      expect(spanBarRow.props.rpc).toBeDefined();
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
        instance = createTestInstance({
          ...mockProps,
          trace: altTrace,
        });

        const rowResult = instance.renderRow('some-key', {}, leafSpanIndex, {});
        const spanBarRow = rowResult.props.children;

        expect(spanBarRow.type).toBe(SpanBarRow);
        expect(spanBarRow.props.noInstrumentedServer).not.toBeNull();
      });
    });

    it('renderSpanBarRow returns null if trace is falsy', () => {
      const component = new VirtualizedTraceViewImpl({ ...mockProps, trace: null });
      const result = component.renderSpanBarRow(trace.spans[0], 0, 'key', {}, {});
      expect(result).toBeNull();
    });

    it('renderSpanDetailRow returns null if detailState is missing', () => {
      const component = new VirtualizedTraceViewImpl(mockProps);
      const result = component.renderSpanDetailRow(trace.spans[0], 'key', {}, {});
      expect(result).toBeNull();
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
      const result = VirtualizedTraceViewImpl.prototype.getCriticalPathSections.call(
        { props: { ...mockProps, trace } },
        true,
        trace,
        spanID,
        undefined
      );
      expect(result).toEqual([]);
    });
  });

  describe('shouldScrollToFirstUiFindMatch', () => {
    it('calls props.scrollToFirstVisibleSpan if shouldScrollToFirstUiFindMatch is true', () => {
      const updatedProps = { ...mockProps, shouldScrollToFirstUiFindMatch: true };
      const component = new VirtualizedTraceViewImpl(updatedProps);
      component.listView = {};
      component.componentDidUpdate(mockProps);

      expect(mockProps.scrollToFirstVisibleSpan).toHaveBeenCalledTimes(1);
      expect(mockProps.clearShouldScrollToFirstUiFindMatch).toHaveBeenCalledTimes(1);
    });

    describe('shouldComponentUpdate', () => {
      it('returns true if props.shouldScrollToFirstUiFindMatch changes to true', () => {
        const result = VirtualizedTraceViewImpl.prototype.shouldComponentUpdate.call(
          { props: mockProps },
          { ...mockProps, shouldScrollToFirstUiFindMatch: true }
        );
        expect(result).toBe(true);
      });

      it('returns true if props.shouldScrollToFirstUiFindMatch changes to false and another props change', () => {
        const result = VirtualizedTraceViewImpl.prototype.shouldComponentUpdate.call(
          { props: { ...mockProps, shouldScrollToFirstUiFindMatch: true } },
          {
            ...mockProps,
            shouldScrollToFirstUiFindMatch: false,
            clearShouldScrollToFirstUiFindMatch: jest.fn(),
          }
        );
        expect(result).toBe(true);
      });

      it('returns false if props.shouldScrollToFirstUiFindMatch changes to false and no other props change', () => {
        const result = VirtualizedTraceViewImpl.prototype.shouldComponentUpdate.call(
          { props: { ...mockProps, shouldScrollToFirstUiFindMatch: true } },
          mockProps
        );
        expect(result).toBe(false);
      });

      it('returns false if all props are unchanged', () => {
        const result = VirtualizedTraceViewImpl.prototype.shouldComponentUpdate.call(
          { props: mockProps },
          mockProps
        );
        expect(result).toBe(false);
      });
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

  describe('getAccessors()', () => {
    it('throws when getAccessors is called before listView is set', () => {
      const component = new VirtualizedTraceViewImpl(mockProps);
      expect(() => component.getAccessors()).toThrow('ListView unavailable');
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
});
