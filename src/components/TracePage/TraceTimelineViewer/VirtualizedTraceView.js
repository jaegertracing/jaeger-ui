// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import * as React from 'react';
import cx from 'classnames';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { actions } from './duck';
import ListView from './ListView';
import SpanBarRow from './SpanBarRow';
import DetailState from './SpanDetail/DetailState';
import SpanDetailRow from './SpanDetailRow';
import {
  findServerChildSpan,
  formatDuration,
  getViewedBounds,
  isErrorSpan,
  spanContainsErredSpan,
} from './utils';
import type { Accessors } from '../ScrollManager';
import type { Log, Span, Trace } from '../../../types';
import colorGenerator from '../../../utils/color-generator';

import './VirtualizedTraceView.css';

type Style = { [string]: string | number };

type RowState = {
  isDetail: boolean,
  span: Span,
  spanIndex: number,
};

type VirtualizedTraceViewProps = {
  childrenHiddenIDs: Set<string>,
  childrenToggle: string => void,
  currentViewRangeTime: [number, number],
  detailLogItemToggle: (string, Log) => void,
  detailLogsToggle: string => void,
  detailProcessToggle: string => void,
  detailStates: Map<string, ?DetailState>,
  detailTagsToggle: string => void,
  detailToggle: string => void,
  find: (?Trace, ?string) => void,
  findMatchesIDs: Set<string>,
  registerAccessors: Accessors => void,
  setSpanNameColumnWidth: number => void,
  setTrace: (?string) => void,
  spanNameColumnWidth: number,
  textFilter: ?string,
  trace: Trace,
};

const DEFAULT_HEIGHTS = {
  bar: 21,
  detail: 169,
  detailWithLogs: 223,
};

const NUM_TICKS = 5;

function generateRowStates(
  spans: ?(Span[]),
  childrenHiddenIDs: Set<string>,
  detailStates: Map<string, ?DetailState>
): RowState[] {
  if (!spans) {
    return [];
  }
  let collapseDepth = null;
  const rowStates = [];
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    const { spanID, depth } = span;
    let hidden = false;
    if (collapseDepth != null) {
      if (depth >= collapseDepth) {
        hidden = true;
      } else {
        collapseDepth = null;
      }
    }
    if (hidden) {
      continue;
    }
    if (childrenHiddenIDs.has(spanID)) {
      collapseDepth = depth + 1;
    }
    rowStates.push({
      span,
      isDetail: false,
      spanIndex: i,
    });
    if (detailStates.has(spanID)) {
      rowStates.push({
        span,
        isDetail: true,
        spanIndex: i,
      });
    }
  }
  return rowStates;
}

function getCssClasses(currentViewRange: [number, number]) {
  const [zoomStart, zoomEnd] = currentViewRange;
  return cx({
    'clipping-left': zoomStart > 0,
    'clipping-right': zoomEnd < 1,
  });
}

// export from tests
export class VirtualizedTraceViewImpl extends React.PureComponent<VirtualizedTraceViewProps> {
  // regarding `props` - eslint-plugin-react is not compat with flow 0.53, yet
  // https://github.com/yannickcr/eslint-plugin-react/issues/1376
  props: VirtualizedTraceViewProps;
  rowStates: RowState[];
  clippingCssClasses: string;
  listView: ?ListView;

  constructor(props: VirtualizedTraceViewProps) {
    super(props);
    this.getViewRange = this.getViewRange.bind(this);
    this.getSearchedSpanIDs = this.getSearchedSpanIDs.bind(this);
    this.getCollapsedChildren = this.getCollapsedChildren.bind(this);
    this.mapRowIndexToSpanIndex = this.mapRowIndexToSpanIndex.bind(this);
    this.mapSpanIndexToRowIndex = this.mapSpanIndexToRowIndex.bind(this);
    this.setListView = this.setListView.bind(this);
    this.getKeyFromIndex = this.getKeyFromIndex.bind(this);
    this.getIndexFromKey = this.getIndexFromKey.bind(this);
    this.getRowHeight = this.getRowHeight.bind(this);
    this.renderRow = this.renderRow.bind(this);
    // keep "prop derivations" on the instance instead of calculating in
    // `.render()` to avoid recalculating in every invocation of `.renderRow()`
    const { currentViewRangeTime, childrenHiddenIDs, detailStates, trace } = props;
    this.clippingCssClasses = getCssClasses(currentViewRangeTime);
    this.rowStates = generateRowStates(trace.spans, childrenHiddenIDs, detailStates);

    const { find, setTrace, textFilter } = props;
    const traceID = trace ? trace.traceID : null;
    setTrace(traceID);
    if (textFilter) {
      find(trace, textFilter);
    }
  }

  componentWillUpdate(nextProps: VirtualizedTraceViewProps) {
    const {
      childrenHiddenIDs,
      detailStates,
      registerAccessors,
      textFilter,
      trace,
      currentViewRangeTime,
    } = this.props;
    const {
      currentViewRangeTime: nextViewRangeTime,
      childrenHiddenIDs: nextHiddenIDs,
      detailStates: nextDetailStates,
      find,
      registerAccessors: nextRegisterAccessors,
      setTrace,
      textFilter: nextTextFilter,
      trace: nextTrace,
    } = nextProps;
    if (trace !== nextTrace) {
      setTrace(nextTrace ? nextTrace.traceID : null);
      if (nextTextFilter) {
        find(nextTrace, nextTextFilter);
      }
    } else if (textFilter !== nextTextFilter) {
      find(nextTrace, nextTextFilter);
    }
    if (trace !== nextTrace || childrenHiddenIDs !== nextHiddenIDs || detailStates !== nextDetailStates) {
      this.rowStates = generateRowStates(nextTrace.spans, nextHiddenIDs, nextDetailStates);
    }
    if (currentViewRangeTime !== nextViewRangeTime) {
      this.clippingCssClasses = getCssClasses(nextViewRangeTime);
    }
    if (this.listView && registerAccessors !== nextRegisterAccessors) {
      nextRegisterAccessors(this.getAccessors());
    }
  }

  getAccessors() {
    const lv = this.listView;
    if (!lv) {
      throw new Error('ListView unavailable');
    }
    return {
      getViewRange: this.getViewRange,
      getSearchedSpanIDs: this.getSearchedSpanIDs,
      getCollapsedChildren: this.getCollapsedChildren,
      getViewHeight: lv.getViewHeight,
      getBottomRowIndexVisible: lv.getBottomVisibleIndex,
      getTopRowIndexVisible: lv.getTopVisibleIndex,
      getRowPosition: lv.getRowPosition,
      mapRowIndexToSpanIndex: this.mapRowIndexToSpanIndex,
      mapSpanIndexToRowIndex: this.mapSpanIndexToRowIndex,
    };
  }

  getViewRange = function getViewRange() {
    return this.props.currentViewRangeTime;
  };

  getSearchedSpanIDs = function getSearchedSpanIDs() {
    return this.props.findMatchesIDs;
  };

  getCollapsedChildren = function getCollapsedChildren() {
    return this.props.childrenHiddenIDs;
  };

  mapRowIndexToSpanIndex = function mapRowIndexToSpanIndex(index: number) {
    return this.rowStates[index].spanIndex;
  };

  mapSpanIndexToRowIndex = function mapSpanIndexToRowIndex(index: number) {
    const max = this.rowStates.length;
    for (let i = 0; i < max; i++) {
      const { spanIndex } = this.rowStates[i];
      if (spanIndex === index) {
        return i;
      }
    }
    throw new Error(`unable to find row for span index: ${index}`);
  };

  setListView = function setListView(listView: ?ListView) {
    const isChanged = this.listView !== listView;
    this.listView = listView;
    if (listView && isChanged) {
      this.props.registerAccessors(this.getAccessors());
    }
  };

  // use long form syntax to avert flow error
  // https://github.com/facebook/flow/issues/3076#issuecomment-290944051
  getKeyFromIndex = function getKeyFromIndex(index: number) {
    const { isDetail, span } = this.rowStates[index];
    return `${span.spanID}--${isDetail ? 'detail' : 'bar'}`;
  };

  getIndexFromKey = function getIndexFromKey(key: string) {
    const parts = key.split('--');
    const _spanID = parts[0];
    const _isDetail = parts[1] === 'detail';
    const max = this.rowStates.length;
    for (let i = 0; i < max; i++) {
      const { span, isDetail } = this.rowStates[i];
      if (span.spanID === _spanID && isDetail === _isDetail) {
        return i;
      }
    }
    return -1;
  };

  getRowHeight = function getRowHeight(index: number) {
    const { span, isDetail } = this.rowStates[index];
    if (!isDetail) {
      return DEFAULT_HEIGHTS.bar;
    }
    if (Array.isArray(span.logs) && span.logs.length) {
      return DEFAULT_HEIGHTS.detailWithLogs;
    }
    return DEFAULT_HEIGHTS.detail;
  };

  renderRow = function renderRow(key: string, style: Style, index: number, attrs: {}) {
    const { isDetail, span, spanIndex } = this.rowStates[index];
    return isDetail
      ? this.renderSpanDetailRow(span, key, style, attrs)
      : this.renderSpanBarRow(span, spanIndex, key, style, attrs);
  };

  renderSpanBarRow(span: Span, spanIndex: number, key: string, style: Style, attrs: {}) {
    const { spanID } = span;
    const { serviceName } = span.process;
    const {
      childrenHiddenIDs,
      childrenToggle,
      currentViewRangeTime,
      detailStates,
      detailToggle,
      findMatchesIDs,
      spanNameColumnWidth,
      trace,
    } = this.props;
    const [zoomStart, zoomEnd] = currentViewRangeTime;
    // to avert flow error
    if (!trace) {
      return null;
    }
    const color = colorGenerator.getColorByKey(serviceName);
    const isCollapsed = childrenHiddenIDs.has(spanID);
    const isDetailExapnded = detailStates.has(spanID);
    const isFilteredOut = Boolean(findMatchesIDs) && !findMatchesIDs.has(spanID);
    const showErrorIcon = isErrorSpan(span) || (isCollapsed && spanContainsErredSpan(trace.spans, spanIndex));
    const viewBounds = getViewedBounds({
      min: trace.startTime,
      max: trace.endTime,
      start: span.startTime,
      end: span.startTime + span.duration,
      viewStart: zoomStart,
      viewEnd: zoomEnd,
    });

    // Check for direct child "server" span if the span is a "client" span.
    let rpc = null;
    if (isCollapsed) {
      const rpcSpan = findServerChildSpan(trace.spans.slice(spanIndex));
      if (rpcSpan) {
        const rpcViewBounds = getViewedBounds({
          min: trace.startTime,
          max: trace.endTime,
          start: rpcSpan.startTime,
          end: rpcSpan.startTime + rpcSpan.duration,
          viewStart: zoomStart,
          viewEnd: zoomEnd,
        });
        rpc = {
          color: colorGenerator.getColorByKey(rpcSpan.process.serviceName),
          operationName: rpcSpan.operationName,
          serviceName: rpcSpan.process.serviceName,
          viewEnd: rpcViewBounds.end,
          viewStart: rpcViewBounds.start,
        };
      }
    }
    return (
      <div className="VirtualizedTraceView--row" key={key} style={style} {...attrs}>
        <SpanBarRow
          className={this.clippingCssClasses}
          color={color}
          columnDivision={spanNameColumnWidth}
          depth={span.depth}
          label={formatDuration(span.duration)}
          isChildrenExpanded={!isCollapsed}
          isDetailExapnded={isDetailExapnded}
          isFilteredOut={isFilteredOut}
          isParent={span.hasChildren}
          numTicks={NUM_TICKS}
          onDetailToggled={detailToggle}
          onChildrenToggled={childrenToggle}
          operationName={span.operationName}
          rpc={rpc}
          serviceName={span.process.serviceName}
          showErrorIcon={showErrorIcon}
          spanID={spanID}
          viewEnd={viewBounds.end}
          viewStart={viewBounds.start}
        />
      </div>
    );
  }

  renderSpanDetailRow(span: Span, key: string, style: Style, attrs: {}) {
    const { spanID } = span;
    const { serviceName } = span.process;
    const {
      detailLogItemToggle,
      detailLogsToggle,
      detailProcessToggle,
      detailStates,
      detailTagsToggle,
      detailToggle,
      findMatchesIDs,
      spanNameColumnWidth,
      trace,
    } = this.props;
    const detailState = detailStates.get(spanID);
    if (!trace || !detailState) {
      return null;
    }
    const color = colorGenerator.getColorByKey(serviceName);
    const isFilteredOut = Boolean(findMatchesIDs) && !findMatchesIDs.has(spanID);
    return (
      <div className="VirtualizedTraceView--row" key={key} style={{ ...style, zIndex: 1 }} {...attrs}>
        <SpanDetailRow
          color={color}
          columnDivision={spanNameColumnWidth}
          onDetailToggled={detailToggle}
          detailState={detailState}
          isFilteredOut={isFilteredOut}
          logItemToggle={detailLogItemToggle}
          logsToggle={detailLogsToggle}
          processToggle={detailProcessToggle}
          span={span}
          tagsToggle={detailTagsToggle}
          traceStartTime={trace.startTime}
        />
      </div>
    );
  }

  render() {
    return (
      <div className="VirtualizedTraceView--spans">
        <ListView
          ref={this.setListView}
          dataLength={this.rowStates.length}
          itemHeightGetter={this.getRowHeight}
          itemRenderer={this.renderRow}
          viewBuffer={300}
          viewBufferMin={100}
          itemsWrapperClassName="VirtualizedTraceView--rowsWrapper"
          getKeyFromIndex={this.getKeyFromIndex}
          getIndexFromKey={this.getIndexFromKey}
          windowScroller
        />
      </div>
    );
  }
}

function mapStateToProps(state, ownProps) {
  const traceTimeline = state.traceTimeline;
  return {
    ...traceTimeline,
    ...ownProps,
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(actions, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(VirtualizedTraceViewImpl);
