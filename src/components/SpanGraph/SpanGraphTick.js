import PropTypes from 'prop-types';
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

import React, { Component } from 'react';
import { isEqual } from 'lodash';

import spanGraphTickPropTypes from '../../propTypes/spanGraphTick';
import { DEFAULT_TICK_WIDTH } from '../../selectors/trace';
import { getPercentageOfDuration } from '../../utils/date';

export default class SpanGraphTick extends Component {
  static get propTypes() {
    return {
      color: PropTypes.string,
      initialTimestamp: PropTypes.number.isRequired,
      tick: spanGraphTickPropTypes.isRequired,
      totalDuration: PropTypes.number.isRequired,
    };
  }

  static get defaultProps() {
    return {
      color: '#E5E5E4',
    };
  }

  shouldComponentUpdate(nextProps) {
    return !isEqual(this.props, nextProps);
  }

  render() {
    const {
      color,
      initialTimestamp,
      tick,
      totalDuration,
    } = this.props;
    const { timestamp, width = DEFAULT_TICK_WIDTH, ...rest } = tick;
    const timeSinceSpanStart = timestamp - initialTimestamp;
    const x = getPercentageOfDuration(timeSinceSpanStart, totalDuration);

    let strokeWidth = width;
    if (Math.floor(x) === 0 || Math.ceil(x) === 100) {
      strokeWidth = strokeWidth * 2 - 1;
    }

    return (
      <g aria-hidden="true">
        <line
          style={{ stroke: color }}
          className="span-graph--tick"
          strokeWidth={strokeWidth}
          x1={`${x}%`}
          y1="0%"
          x2={`${x}%`}
          y2="100%"
          {...rest}
        />
      </g>
    );
  }
}
