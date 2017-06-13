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
import React, { Component } from 'react';
import { isEqual } from 'lodash';

import tracePropTypes from '../../propTypes/trace';
import spanGraphTickPropTypes from '../../propTypes/spanGraphTick';
import { getTraceDuration, getTraceTimestamp } from '../../selectors/trace';
import { getPercentageOfInterval } from '../../utils/date';

import SpanGraphTickHeaderLabel from './SpanGraphTickHeaderLabel';

export default class SpanGraphTickHeader extends Component {
  shouldComponentUpdate({ ticks }) {
    const { ticks: prevTicks } = this.props;
    return !isEqual(ticks, prevTicks);
  }

  render() {
    const { ticks, trace } = this.props;

    return trace &&
      <div className="span-graph--tick-header">
        {ticks.map(tick => {
          const leftOffset = getPercentageOfInterval(
            tick.timestamp,
            getTraceTimestamp(trace),
            getTraceDuration(trace)
          );

          const style = Math.ceil(leftOffset) === 100
            ? { right: '0%' }
            : { left: `${leftOffset}%` };

          return (
            <SpanGraphTickHeaderLabel
              key={tick.timestamp}
              trace={trace}
              duration={tick.timestamp - getTraceTimestamp(trace)}
              style={style}
            />
          );
        })}
      </div>;
  }
}

SpanGraphTickHeader.propTypes = {
  trace: tracePropTypes,
  ticks: PropTypes.arrayOf(spanGraphTickPropTypes).isRequired,
};
