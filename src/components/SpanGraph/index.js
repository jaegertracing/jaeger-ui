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

import React, { Children, PropTypes } from 'react';

import './SpanGraph.css';
import SpanGraphTick from './SpanGraphTick';
import SpanGraphSpan from './SpanGraphSpan';
import tracePropTypes from '../../propTypes/trace';
import spanPropTypes from '../../propTypes/span';
import spanGraphTickPropTypes from '../../propTypes/spanGraphTick';
import {
  getTraceId,
  getTraceDuration,
  getTraceTimestamp,
  getTraceSpans,
} from '../../selectors/trace';
import { getSpanId } from '../../selectors/span';

export default function SpanGraph(
  {
    trace,
    getSpanLabel,
    rowHeight,
    rowPadding,
    ticks,
    spans = getTraceSpans(trace),
    onSpanClick,
    children,
    ...rest
  }
) {
  let childElements = children;

  // grab handler functions for spans (such as onSpanClick) off of the
  // rest of the props and build an object with them to be applied to the spans
  const spanHandlerFilter = name =>
    typeof rest[name] === 'function' &&
    name.substr(0, 2) === 'on' &&
    name.substr(-4) === 'Span';
  const spreadable = Object.keys(rest)
    .filter(name => !spanHandlerFilter(name))
    .reduce((obj, name) => Object.assign(obj, { [name]: rest[name] }), {});

  if (!childElements) {
    const spanHandlers = Object.keys(rest).filter(spanHandlerFilter).reduce((
      obj,
      fnName
    ) =>
      Object.assign(obj, {
        [fnName.substr(0, fnName.length - 'Span'.length)]: rest[fnName],
      }), {});

    childElements = spans.map((span, idx) => (
      <SpanGraphSpan
        onClick={() => onSpanClick(span.spanID)}
        key={`trace-${getTraceId(trace)}-span-${getSpanId(span)}`}
        span={span}
        index={idx}
        label={getSpanLabel(span)}
        initialTimestamp={getTraceTimestamp(trace)}
        totalDuration={getTraceDuration(trace)}
        rowHeight={rowHeight}
        rowPadding={rowPadding}
        {...spanHandlers}
      />
    ));
  }

  const height = (rowHeight + rowPadding * 2) * Children.count(childElements);

  return (
    <svg
      className="trace-detail"
      width="100%"
      height={height}
      style={{ marginBottom: -2 * rowPadding }}
      {...spreadable}
    >
      {ticks.map((tick, idx) => (
        <SpanGraphTick
          key={`trace-${getTraceId(trace)}-tick-${idx}`}
          initialTimestamp={getTraceTimestamp(trace)}
          tick={tick}
          totalDuration={getTraceDuration(trace)}
        />
      ))}

      {childElements}
    </svg>
  );
}

SpanGraph.propTypes = {
  children: PropTypes.any,
  getSpanLabel: PropTypes.func,
  rowHeight: PropTypes.number,
  rowPadding: PropTypes.number,
  ticks: PropTypes.arrayOf(spanGraphTickPropTypes),
  trace: tracePropTypes.isRequired,
  spans: PropTypes.arrayOf(spanPropTypes),
  onSpanClick: PropTypes.func,
};

SpanGraph.defaultProps = {
  getSpanLabel: () => '',
  rowHeight: 12,
  rowPadding: 5,
  ticks: [],
  onSpanClick: noop => noop,
};
