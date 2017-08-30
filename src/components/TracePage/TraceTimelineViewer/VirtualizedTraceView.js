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

import ListView from './ListView';
import SpanBarRow from './SpanBarRow';
import DetailState from './SpanDetail/DetailState';
import SpanDetailRow from './SpanDetailRow';
import Ticks from './Ticks';
import TimelineRow from './TimelineRow';
import type { XformedSpan, XformedTrace } from './transforms';
import {
  findServerChildSpan,
  formatDuration,
  getViewedBounds,
  isErrorSpan,
  spanContainsErredSpan,
} from './utils';
import type { Log } from '../../../types';
import colorGenerator from '../../../utils/color-generator';

import './VirtualizedTraceView.css';

type RowState = {
  isDetail: boolean,
  span: XformedSpan,
  spanIndex: number,
};

type VirtualizedTraceViewProps = {
  childrenHiddenIDs: Set<string>,
  childrenToggle: string => void,
  detailLogItemToggle: (string, Log) => void,
  detailLogsToggle: string => void,
  detailProcessToggle: string => void,
  detailStates: Map<string, ?DetailState>,
  detailTagsToggle: string => void,
  detailToggle: string => void,
  findMatchesIDs: Set<string>,
  ticks: number[],
  trace?: XformedTrace,
  zoomEnd: number,
  zoomStart: number,
};

const DEFAULT_HEIGHTS = {
  bar: 21,
  detail: 169,
  detailWithLogs: 223,
};

function generateRowStates(
  spans: ?(XformedSpan[]),
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

function getPropDerivations(props: VirtualizedTraceViewProps) {
  const { childrenHiddenIDs, detailStates, trace, zoomEnd = 1, zoomStart = 0 } = props;
  const clippingCssClasses = cx({
    'clipping-left': zoomStart > 0,
    'clipping-right': zoomEnd < 1,
  });
  let spans: ?(XformedSpan[]);
  if (trace) {
    spans = trace.spans;
  }
  return {
    clippingCssClasses,
    rowStates: generateRowStates(spans, childrenHiddenIDs, detailStates),
  };
}

class VirtualizedTraceView extends React.PureComponent<VirtualizedTraceViewProps> {
  // regarding `props` - eslint-plugin-react is not compat with flow 0.53, yet
  // https://github.com/yannickcr/eslint-plugin-react/issues/1376
  props: VirtualizedTraceViewProps;
  rowStates: RowState[];
  clippingCssClasses: string;

  constructor(props) {
    super(props);
    this.getKeyFromIndex = this.getKeyFromIndex.bind(this);
    this.getIndexFromKey = this.getIndexFromKey.bind(this);
    this.getRowHeight = this.getRowHeight.bind(this);
    this.renderRow = this.renderRow.bind(this);
    // keep "prop derivations" on the instance instead of calculating in
    // `.render()` to avoid recalculating in every invocatino of `.renderRow()`
    const { clippingCssClasses, rowStates } = getPropDerivations(props);
    this.clippingCssClasses = clippingCssClasses;
    this.rowStates = rowStates;
  }

  componentWillReceiveProps(nextProps) {
    const { clippingCssClasses, rowStates } = getPropDerivations(nextProps);
    this.clippingCssClasses = clippingCssClasses;
    this.rowStates = rowStates;
  }

  // use long form syntax to avert flow error
  // https://github.com/facebook/flow/issues/3076#issuecomment-290944051
  getKeyFromIndex = function getKeyFromIndex(index) {
    const { isDetail, span } = this.rowStates[index];
    return `${span.spanID}--${isDetail ? 'detail' : 'bar'}`;
  };

  getIndexFromKey = function getIndexFromKey(key) {
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

  getRowHeight = function getRowHeight(index) {
    const { span, isDetail } = this.rowStates[index];
    if (!isDetail) {
      return DEFAULT_HEIGHTS.bar;
    }
    if (Array.isArray(span.logs) && span.logs.length) {
      return DEFAULT_HEIGHTS.detailWithLogs;
    }
    return DEFAULT_HEIGHTS.detail;
  };

  renderRow = function renderRow(key, style, index, attrs) {
    const { isDetail, span, spanIndex } = this.rowStates[index];
    return isDetail
      ? this.renderSpanDetailRow(span, key, style, attrs)
      : this.renderSpanBarRow(span, spanIndex, key, style, attrs);
  };

  renderSpanBarRow(span, spanIndex, key, style, attrs) {
    const { spanID } = span;
    const { serviceName } = span.process;
    const {
      childrenHiddenIDs,
      findMatchesIDs,
      detailToggle,
      childrenToggle,
      detailStates,
      ticks = [0, 0.25, 0.5, 0.75, 1],
      trace,
      zoomEnd = 1,
      zoomStart = 0,
    } = this.props;
    // to avert flow error
    if (!trace) {
      return null;
    }

    const color = colorGenerator.getColorByKey(serviceName);
    const toggleDetailExpansion = () => detailToggle(spanID);

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
          depth={span.depth}
          label={formatDuration(span.duration)}
          isChildrenExpanded={!isCollapsed}
          isDetailExapnded={isDetailExapnded}
          isFilteredOut={isFilteredOut}
          isParent={span.hasChildren}
          onDetailToggled={toggleDetailExpansion}
          onChildrenToggled={() => childrenToggle(spanID)}
          operationName={span.operationName}
          rpc={rpc}
          serviceName={span.process.serviceName}
          showErrorIcon={showErrorIcon}
          ticks={ticks}
          viewEnd={viewBounds.end}
          viewStart={viewBounds.start}
        />
      </div>
    );
  }

  renderSpanDetailRow(span, key, style, attrs) {
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
          detailToggle={() => detailToggle(spanID)}
          detailState={detailState}
          isFilteredOut={isFilteredOut}
          logItemToggle={detailLogItemToggle}
          logsToggle={detailLogsToggle}
          processToggle={detailProcessToggle}
          span={span}
          tagsToggle={detailTagsToggle}
          trace={trace}
        />
      </div>
    );
  }

  render() {
    const { trace, zoomStart = 0, zoomEnd = 1, ticks = [0, 0.25, 0.5, 0.75, 1] } = this.props;
    if (!trace) {
      return null;
    }
    const zoomMin = zoomStart * trace.duration;
    const zoomMax = zoomEnd * trace.duration;
    const zoomDuration = zoomMax - zoomMin;
    function getDuationAtTick(tick) {
      return zoomMin + tick * zoomDuration;
    }
    return (
      <div className="">
        <TimelineRow className="VirtualizedTraceView--headerRow">
          <TimelineRow.Left>
            <h3 className="m0 p1">Span Name</h3>
          </TimelineRow.Left>
          <TimelineRow.Right>
            <Ticks
              labels={ticks.map(tick => (tick > 0 ? formatDuration(getDuationAtTick(tick)) : ''))}
              ticks={ticks}
            />
            <h3 className="m0 p1">Timeline</h3>
          </TimelineRow.Right>
        </TimelineRow>
        <div className="VirtualizedTraceView--spans">
          <ListView
            dataLength={this.rowStates.length}
            itemHeightGetter={this.getRowHeight}
            itemRenderer={this.renderRow}
            viewBuffer={300}
            viewBufferMin={150}
            itemsWrapperClassName="VirtualizedTraceView--rowsWrapper"
            getKeyFromIndex={this.getKeyFromIndex}
            getIndexFromKey={this.getIndexFromKey}
            windowScroller
          />
        </div>
      </div>
    );
  }
}

function mapStateToProps(state, ownProps) {
  return {
    ...ownProps,
    ...state,
  };
}

export default connect(mapStateToProps)(VirtualizedTraceView);
