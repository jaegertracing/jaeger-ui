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

import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';

import spanPropTypes from '../../propTypes/span';
import colorGenerator from '../../utils/color-generator';
import {
  getPercentageOfDuration,
  getPercentageOfInterval,
} from '../../utils/date';
import {
  getSpanTimestamp,
  getSpanDuration,
  getSpanServiceName,
} from '../../selectors/span';

export const MIN_SPAN_WIDTH = 0.2; // in percent

export default class SpanGraphSpan extends Component {
  static get propTypes() {
    return {
      index: PropTypes.number.isRequired,
      initialTimestamp: PropTypes.number.isRequired,
      rowHeight: PropTypes.number.isRequired,
      rowPadding: PropTypes.number.isRequired,
      span: spanPropTypes.isRequired,
      label: PropTypes.string,
      totalDuration: PropTypes.number.isRequired,
      onClick: PropTypes.func,
    };
  }

  static get defaultProps() {
    return {
      fill: '#11939A',
    };
  }

  shouldComponentUpdate(newProps) {
    return shallowCompare(this, newProps);
  }

  render() {
    const {
      index,
      initialTimestamp,
      label,
      rowHeight,
      rowPadding,
      span,
      totalDuration,
      ...rest
    } = this.props;
    const topOffset = index * (rowHeight + rowPadding * 2) + rowPadding * 2;
    const spanTimestamp = getSpanTimestamp(span);
    const spanDuration = getSpanDuration(span);
    const leftOffset = getPercentageOfInterval(
      spanTimestamp,
      initialTimestamp,
      totalDuration
    );
    const width = getPercentageOfDuration(spanDuration, totalDuration);

    // wrap all "onWhatever" handlers to pass the span along as the first argument.
    // attach any other props to the spreadable object
    const handlerFilter = name =>
      typeof rest[name] === 'function' && name.substr(0, 2) === 'on';
    const handlers = Object.keys(rest).filter(handlerFilter).reduce((
      obj,
      fnName
    ) =>
      Object.assign(obj, {
        [fnName]: (...args) => rest[fnName](span, ...args),
      }), {});
    const spreadable = Object.keys(rest)
      .filter(name => !handlerFilter(name))
      .reduce((obj, name) => Object.assign(obj, { [name]: rest[name] }), {});
    return (
      <g aria-labelledby="title">
        {label && <title>{label}</title>}
        <rect
          style={{
            fill: colorGenerator.getColorByKey(getSpanServiceName(span)),
          }}
          className="span-graph--span-rect"
          id={span.spanID}
          x={`${leftOffset}%`}
          y={topOffset}
          height={rowHeight}
          width={`${Math.max(width, MIN_SPAN_WIDTH)}%`}
          {...handlers}
          {...spreadable}
        />
      </g>
    );
  }
}
