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

import { getTraceTimestamp, getTraceDuration } from '../../selectors/trace';
import { getPercentageOfInterval } from '../../utils/date';

const HANDLE_WIDTH = 6;
const HANDLE_HEIGHT = 20;
const HANDLE_TOP_OFFSET = 0;

export default function TimelineScrubber({
  trace,
  timestamp,
  onMouseDown,
  handleTopOffset = HANDLE_TOP_OFFSET,
  handleWidth = HANDLE_WIDTH,
  handleHeight = HANDLE_HEIGHT,
}) {
  const initialTimestamp = getTraceTimestamp(trace);
  const totalDuration = getTraceDuration(trace);
  const xPercentage = getPercentageOfInterval(timestamp, initialTimestamp, totalDuration);

  return (
    <g className="timeline-scrubber" onMouseDown={onMouseDown}>
      <line
        className="timeline-scrubber__line"
        y1={0}
        y2="100%"
        x1={`${xPercentage}%`}
        x2={`${xPercentage}%`}
      />
      <rect
        x={`${xPercentage}%`}
        y={handleTopOffset}
        className="timeline-scrubber__handle"
        style={{ transform: `translate(${-(handleWidth / 2)}px)` }}
        rx={handleWidth / 4}
        ry={handleWidth / 4}
        width={handleWidth}
        height={handleHeight}
      />
      <circle
        className="timeline-scrubber__handle--grip"
        style={{ transform: `translateY(${handleHeight / 4}px)` }}
        cx={`${xPercentage}%`}
        cy={'50%'}
      />
      <circle className="timeline-scrubber__handle--grip" cx={`${xPercentage}%`} cy={'50%'} />
      <circle
        className="timeline-scrubber__handle--grip"
        style={{ transform: `translateY(${-(handleHeight / 4)}px)` }}
        cx={`${xPercentage}%`}
        cy={'50%'}
      />
    </g>
  );
}

TimelineScrubber.propTypes = {
  onMouseDown: PropTypes.func,
  trace: PropTypes.object,
  timestamp: PropTypes.number.isRequired,
  handleTopOffset: PropTypes.number,
  handleWidth: PropTypes.number,
  handleHeight: PropTypes.number,
};
