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

import PropTypes from 'prop-types';
import React from 'react';
import cx from 'classnames';

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

export default function TraceView(props) {
  const {
    trace,
    zoomStart = 0,
    zoomEnd = 1,
    collapsedSpanIDs,
    selectedSpanIDs,
    filteredSpansIDs,
    onSpanClick,
    onSpanCollapseClick,
    ticks = [0, 0.25, 0.5, 0.75, 1],
  } = props;

  const zoomMin = zoomStart * trace.duration;
  const zoomMax = zoomEnd * trace.duration;
  const zoomDuration = zoomMax - zoomMin;
  function getDuationAtTick(tick) {
    return zoomMin + tick * zoomDuration;
  }

  const clippingCssClasses = cx({
    'clipping-left': zoomStart > 0,
    'clipping-right': zoomEnd < 1,
  });

  let collapseBelow = null;

  const renderSpansRows = trace.spans.reduce((arr, span, i) => {
    const { spanID } = span;
    const spanIsCollapsed = collapsedSpanIDs.has(spanID);
    // Collapse logic
    // TODO: Investigate if this should be moved out to statefull component.
    let hidden = false;
    if (collapseBelow) {
      if (span.depth >= collapseBelow) {
        hidden = true;
      } else {
        collapseBelow = null;
      }
    }
    if (hidden) {
      return arr;
    }
    if (spanIsCollapsed) {
      collapseBelow = span.depth + 1;
    }

    const spanColor = colorGenerator.getColorByKey(span.process.serviceName);
    const isDetailExapnded = selectedSpanIDs.has(spanID);
    const isFilteredOut = Boolean(filteredSpansIDs) && !filteredSpansIDs.has(spanID);
    const { start: viewStart, end: viewEnd } = getViewedBounds({
      min: trace.startTime,
      max: trace.endTime,
      start: span.startTime,
      end: span.startTime + span.duration,
      viewStart: zoomStart,
      viewEnd: zoomEnd,
    });

    // Check for direct child "server" span if the span is a "client" span.
    // TODO: Can probably optimize this a bit more so it does not do it
    // on render.
    let rpc = null;
    if (spanIsCollapsed) {
      const childServerSpan = findServerChildSpan(trace.spans.slice(i));
      if (childServerSpan) {
        const { start: rpcStart, end: rpcEnd } = getViewedBounds({
          min: trace.startTime,
          max: trace.endTime,
          start: childServerSpan.startTime,
          end: childServerSpan.startTime + childServerSpan.duration,
          viewStart: zoomStart,
          viewEnd: zoomEnd,
        });
        rpc = {
          serviceName: childServerSpan.process.serviceName,
          operationName: childServerSpan.operationName,
          color: colorGenerator.getColorByKey(childServerSpan.process.serviceName),
          viewStart: rpcStart,
          viewEnd: rpcEnd,
        };
      }
    }
    const showErrorIcon = isErrorSpan(span) || (spanIsCollapsed && spanContainsErredSpan(trace.spans, i));
    const toggleDetailExpansion = () => onSpanClick(spanID);
    arr.push(
      <SpanBarRow
        key={spanID}
        className={clippingCssClasses}
        color={spanColor}
        depth={span.depth}
        label={formatDuration(span.duration)}
        isChildrenExpanded={!spanIsCollapsed}
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
        viewEnd={viewEnd}
        viewStart={viewStart}
      />
    );
    if (isDetailExapnded) {
      arr.push(
        <SpanDetailRow
          key={`${spanID}-details`}
          color={spanColor}
          isFilteredOut={isFilteredOut}
          span={span}
          toggleDetailExpansion={toggleDetailExpansion}
          trace={trace}
        />
      );
    }
    return arr;
  }, []);
  return (
    <div className="mx0 px1 overflow-hidden">
      <TimelineRow style={{ backgroundColor: '#e8e8e8', borderBottom: '1px solid #ccc' }}>
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
      {renderSpansRows}
    </div>
  );
}
TraceView.propTypes = {
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
