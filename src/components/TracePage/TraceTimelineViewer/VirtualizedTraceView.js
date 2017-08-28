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
import { connect } from 'react-redux';
import { AutoSizer, List, WindowScroller } from 'react-virtualized';

import ListView from './ListView';
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
import colorGenerator from '../../../utils/color-generator';

import './VirtualizedTraceView.css';

const DEFAULT_HEIGHTS = {
  bar: 21,
  detail: 169,
  detailWithLogs: 223,
};

function generateRowStates(spans, childrenHiddenIDs, detailStates) {
  let collapseDepth = null;
  const rowStates = [];
  const detailRowIndexes = new Map();
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
      detailRowIndexes.set(spanID, rowStates.length);
      rowStates.push({
        span,
        isDetail: true,
        spanIndex: i,
      });
    }
  }
  return { detailRowIndexes, rowStates };
}

// TODO(joe): rename func
function deriveState(props) {
  const { childrenHiddenIDs, detailStates, trace, zoomEnd = 1, zoomStart = 0 } = props;
  const clippingCssClasses = cx({
    'clipping-left': zoomStart > 0,
    'clipping-right': zoomEnd < 1,
  });
  const rowInfo = trace
    ? generateRowStates(trace.spans, childrenHiddenIDs, detailStates)
    : { detailRowIndexes: new Map(), rowStates: [] };
  return {
    ...rowInfo,
    clippingCssClasses,
  };
}

class VirtualizedTraceView extends PureComponent {
  constructor(props) {
    super(props);
    // console.log('------ctor props:', props);

    this.listRef = null;
    this.lastDetailStateChange = null;

    const { detailRowIndexes, rowStates, clippingCssClasses } = deriveState(props);
    this.rowStates = rowStates;
    this.clippingCssClasses = clippingCssClasses;
    this.detailRowIndexes = detailRowIndexes;
    this.detailRowMeasurements = new Map();

    this.getKeyFromIndex = this.getKeyFromIndex.bind(this);
    this.getIndexFromKey = this.getIndexFromKey.bind(this);
    this.getRowHeight = this.getRowHeight.bind(this);
    // this.renderRow = this.renderRow.bind(this);
    this.renderRowLV = this.renderRowLV.bind(this);
    this.updateDetailMeasurement = this.updateDetailMeasurement.bind(this);
  }

  // getRowHeight({ index }) {
  //   // console.log('get row hight', index);
  //   const { isDetail, span } = this.rowStates[index];
  //   if (isDetail) {
  //     const h = this.detailRowMeasurements.get(span.spanID);
  //     // console.log('h', span.spanID, h);
  //     if (h != null) {
  //       return h;
  //     }
  //   }
  //   // console.log('21')
  //   return 21;
  // }

  getKeyFromIndex(index) {
    const { isDetail, span } = this.rowStates[index];
    return `${span.spanID}--${isDetail ? 'detail' : 'bar'}`;
  }

  getIndexFromKey(key) {
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
  }

  getRowHeight(index) {
    const { span, isDetail } = this.rowStates[index];
    if (!isDetail) {
      return DEFAULT_HEIGHTS.bar;
    }
    if (Array.isArray(span.logs) && span.logs.length) {
      return DEFAULT_HEIGHTS.detailWithLogs;
    }
    return DEFAULT_HEIGHTS.detail;
  }

  // renderRow({
  //   index, // Index of row
  //   // isScrolling, // The List is currently being scrolled
  //   // isVisible,   // This row is visible within the List (eg it is not an overscanned row)
  //   key, // Unique key within array of rendered rows
  //   parent,      // Reference to the parent List (instance)
  //   style, // Style object to be applied to row (to position it);
  //   // This must be passed through to the rendered row element.
  // }) {
  //   // console.log('render row');
  //   this.listRef = parent;
  //   const { isDetail, span, spanIndex } = this.rowStates[index];
  //   return isDetail
  //     ? this.renderSpanDetailRow(span, key, style)
  //     : this.renderSpanBarRow(span, spanIndex, key, style);
  // }

  renderRowLV(key, style, index, attrs) {
    // console.log('render row LV');
    // this.listRef = parent;
    const { isDetail, span, spanIndex } = this.rowStates[index];
    return isDetail
      ? this.renderSpanDetailRow(span, key, style, attrs)
      : this.renderSpanBarRow(span, spanIndex, key, style, attrs);
  }

  renderSpanBarRow(span, spanIndex, key, style, attrs = {}) {
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

  renderSpanDetailRow(span, key, style, attrs = {}) {
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
    const color = colorGenerator.getColorByKey(serviceName);
    const isFilteredOut = Boolean(findMatchesIDs) && !findMatchesIDs.has(spanID);
    const detailExpansionToggle = () => detailToggle(spanID);
    const onMeasureChange = (width, height) => this.updateDetailMeasurement(spanID, width, height);
    return (
      <div className="VirtualizedTraceView--row" key={key} style={{ ...style, zIndex: 1 }} {...attrs}>
        <SpanDetailRow
          color={color}
          detailExpansionToggle={detailExpansionToggle}
          detailState={detailState}
          isFilteredOut={isFilteredOut}
          logItemToggle={detailLogItemToggle}
          logsToggle={detailLogsToggle}
          onMeasureChange={onMeasureChange}
          processToggle={detailProcessToggle}
          span={span}
          tagsToggle={detailTagsToggle}
          trace={trace}
        />
      </div>
    );
  }

  componentWillReceiveProps(nextProps) {
    // console.log('will get props');
    console.log('new props:', nextProps);
    // const nextState = deriveState(nextProps);
    // this.setState(nextState);
    const { detailRowIndexes, rowStates, clippingCssClasses } = deriveState(nextProps);
    this.rowStates = rowStates;
    this.clippingCssClasses = clippingCssClasses;
    this.detailRowIndexes = detailRowIndexes;
    // if (this.listRef) {
    //   this.listRef.forceGridUpdate();
    // }
  }

  updateDetailMeasurement(spanID, width, height) {
    console.log(this.name, 'detail measurement:', spanID, width, height);
    const h = this.detailRowMeasurements.get(spanID);
    if (h !== height) {
      this.detailRowMeasurements.set(spanID, height);
      if (this.listRef) {
        const i = this.detailRowIndexes.get(spanID);
        console.log('compute heights', i);
        // this.listRef.recomputeGridSize({ rowIndex: i });
      }
    }
  }

  componentDidUpdate() {
    if (this.listRef) {
      this.listRef.forceUpdate();
    }
  }

  render() {
    console.log('render virt', this.rowStates.length);
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
          <ListView
            data={this.rowStates}
            averageItemHeight={21}
            itemHeightGetter={this.getRowHeight}
            itemRenderer={this.renderRowLV}
            viewBuffer={300}
            viewBufferMin={150}
            itemsWrapperClassName="VirtualizedTraceView--rowsWrapper"
            getKeyFromIndex={this.getKeyFromIndex}
            getIndexFromKey={this.getIndexFromKey}
            windowScroller
          />
        </div>
        {/*
        <div className="VirtualizedTraceView--spans">
          <WindowScroller scrollingResetTimeInterval={10}>
            {({ height, scrollTop }) =>
              <AutoSizer disableHeight>
                {({ width }) =>
                  <List
                    autoHeight
                    estimatedRowSize={21}
                    height={height}
                    overscanRowCount={150}
                    rowCount={this.rowStates.length}
                    rowHeight={this.getRowHeight}
                    rowRenderer={this.renderRow}
                    scrollTop={scrollTop}
                    width={width}
                  />}
              </AutoSizer>}
          </WindowScroller>
        </div>
*/}
      </div>
    );
  }
}

VirtualizedTraceView.propTypes = {
  trace: PropTypes.object,
  childrenHiddenIDs: PropTypes.object,
  detailStates: PropTypes.object,
  findMatchesIDs: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
  ticks: PropTypes.arrayOf(PropTypes.number),
  zoomStart: PropTypes.number,
  zoomEnd: PropTypes.number,
  detailToggle: PropTypes.func,
  childrenToggle: PropTypes.func,
};

function mapStateToProps(state, ownProps) {
  return {
    ...ownProps,
    ...state,
  };
}

export default connect(mapStateToProps)(VirtualizedTraceView);
