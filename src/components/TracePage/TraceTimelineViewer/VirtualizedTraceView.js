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

import React, { PureComponent } from 'react';
import cx from 'classnames';
import PropTypes from 'prop-types';
import { AutoSizer, List, WindowScroller } from 'react-virtualized';

import colorGenerator from '../../../utils/color-generator';
import SpanBarRow from './SpanBarRow';
import SpanDetailRow from './SpanDetailRow';
import Ticks from './Ticks';
import TimelineRow from './TimelineRow';
import {
  findServerChildSpan,
  formatDuration,
  getViewedBounds,
  isErrorSpan,
  spanContainsErredSpan,
} from './utils';

import './VirtualizedTraceView.css';

function generateRowStates(spans, collapsedSpanIDs, selectedSpanIDs) {
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
    if (collapsedSpanIDs.has(spanID)) {
      collapseDepth = depth + 1;
    }
    rowStates.push({
      span,
      isDetail: false,
      spanIndex: i,
    });
    if (selectedSpanIDs.has(spanID)) {
      rowStates.push({
        span,
        isDetail: true,
        spanIndex: i,
      });
    }
  }
  return rowStates;
  // return {
  //   data: rowStates,
  //   signature: rowStates.map(st => `${st.span.spanID}:${st.isDetail ? 'detail' : 'bar'}`).join('|'),
  // }
}

export default class VirtualizedTraceView extends PureComponent {
  constructor(props) {
    super(props);
    const { collapsedSpanIDs, selectedSpanIDs, trace, zoomEnd = 1, zoomStart = 0 } = this.props;

    const clippingCssClasses = cx({
      'clipping-left': zoomStart > 0,
      'clipping-right': zoomEnd < 1,
    });

    this.state = {
      clippingCssClasses,
      rowStates: trace ? generateRowStates(trace.spans, collapsedSpanIDs, selectedSpanIDs) : [],
    };

    this.renderRow = this.renderRow.bind(this);
  }

  renderRow({
    index, // Index of row
    // isScrolling, // The List is currently being scrolled
    // isVisible,   // This row is visible within the List (eg it is not an overscanned row)
    key, // Unique key within array of rendered rows
    // parent,      // Reference to the parent List (instance)
    style, // Style object to be applied to row (to position it);
    // This must be passed through to the rendered row element.
  }) {
    const { isDetail, span, spanIndex } = this.state.rowStates[index];
    return isDetail
      ? this.renderSpanDetailRow(span, key, style)
      : this.renderSpanBarRow(span, spanIndex, key, style);
  }

  renderSpanBarRow(span, spanIndex, key, style) {
    const { spanID } = span;
    const { serviceName } = span.process;
    const {
      collapsedSpanIDs,
      filteredSpansIDs,
      onSpanClick,
      onSpanCollapseClick,
      selectedSpanIDs,
      ticks = [0, 0.25, 0.5, 0.75, 1],
      trace,
      zoomEnd = 1,
      zoomStart = 0,
    } = this.props;
    const { clippingCssClasses } = this.state;

    const color = colorGenerator.getColorByKey(serviceName);
    const toggleDetailExpansion = () => onSpanClick(spanID);

    const isCollapsed = collapsedSpanIDs.has(spanID);
    const isDetailExapnded = selectedSpanIDs.has(spanID);
    const isFilteredOut = Boolean(filteredSpansIDs) && !filteredSpansIDs.has(spanID);
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
      <div key={key} style={style}>
        <SpanBarRow
          className={clippingCssClasses}
          color={color}
          depth={span.depth}
          label={formatDuration(span.duration)}
          isChildrenExpanded={!isCollapsed}
          isDetailExapnded={isDetailExapnded}
          isFilteredOut={isFilteredOut}
          isParent={span.hasChildren}
          onDetailToggled={toggleDetailExpansion}
          onChildrenToggled={() => onSpanCollapseClick(spanID)}
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

  renderSpanDetailRow(span, key, style) {
    const { spanID } = span;
    const { serviceName } = span.process;
    const { filteredSpansIDs, onSpanClick, trace } = this.props;
    const color = colorGenerator.getColorByKey(serviceName);
    const isFilteredOut = Boolean(filteredSpansIDs) && !filteredSpansIDs.has(spanID);
    const toggleDetailExpansion = () => onSpanClick(spanID);
    return (
      <div key={key} style={style}>
        <SpanDetailRow
          color={color}
          isFilteredOut={isFilteredOut}
          span={span}
          toggleDetailExpansion={toggleDetailExpansion}
          trace={trace}
        />
      </div>
    );
  }

  render() {
    const { trace, zoomStart = 0, zoomEnd = 1, ticks = [0, 0.25, 0.5, 0.75, 1] } = this.props;

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
          <WindowScroller scrollingResetTimeInterval={10}>
            {({ height, scrollTop }) =>
              <AutoSizer disableHeight>
                {({ width }) =>
                  <List
                    width={width}
                    scrollTop={scrollTop}
                    autoHeight
                    height={height}
                    rowCount={this.state.rowStates.length}
                    rowHeight={21}
                    estimatedRowSize={21}
                    overscanRowCount={200}
                    rowRenderer={this.renderRow}
                  />}
              </AutoSizer>}
          </WindowScroller>
        </div>
      </div>
    );
  }
}
VirtualizedTraceView.propTypes = {
  trace: PropTypes.object,
  collapsedSpanIDs: PropTypes.object,
  selectedSpanIDs: PropTypes.object,
  filteredSpansIDs: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
  ticks: PropTypes.arrayOf(PropTypes.number),
  zoomStart: PropTypes.number,
  zoomEnd: PropTypes.number,
  onSpanClick: PropTypes.func,
  onSpanCollapseClick: PropTypes.func,
};
