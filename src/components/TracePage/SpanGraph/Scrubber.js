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

import React from 'react';

import './Scrubber.css';

type ScrubberProps = {
  position: number,
  onMouseDown: (SyntheticMouseEvent<any>) => void,
  handleTopOffset: number,
  handleWidth: number,
  handleHeight: number,
};

const HANDLE_WIDTH = 6;
const HANDLE_HEIGHT = 20;
const HANDLE_TOP_OFFSET = 0;

export default function Scrubber({
  position,
  onMouseDown,
  handleTopOffset = HANDLE_TOP_OFFSET,
  handleWidth = HANDLE_WIDTH,
  handleHeight = HANDLE_HEIGHT,
}: ScrubberProps) {
  const xPercent = `${position * 100}%`;
  return (
    <g className="timeline-scrubber" onMouseDown={onMouseDown}>
      <line className="timeline-scrubber__line" y2="100%" x1={xPercent} x2={xPercent} />
      <rect
        x={xPercent}
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
        cx={xPercent}
        cy="50%"
        r="2"
      />
      <circle className="timeline-scrubber__handle--grip" cx={xPercent} cy="50%" r="2" />
      <circle
        className="timeline-scrubber__handle--grip"
        style={{ transform: `translateY(${-handleHeight / 4}px)` }}
        cx={xPercent}
        cy="50%"
        r="2"
      />
    </g>
  );
}
