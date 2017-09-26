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
import cx from 'classnames';

import './Scrubber.css';

type ScrubberProps = {
  isDragging: boolean,
  position: number,
  onMouseDown: (SyntheticMouseEvent<any>) => void,
  onMouseEnter: (SyntheticMouseEvent<any>) => void,
  onMouseLeave: (SyntheticMouseEvent<any>) => void,
};

export default function Scrubber({
  isDragging,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  position,
}: ScrubberProps) {
  const xPercent = `${position * 100}%`;
  const className = cx('Scrubber', { isDragging });
  return (
    <g className={className}>
      <rect
        x={xPercent}
        className="Scrubber--handle"
        style={{ transform: `translate(-1.5px)` }}
        width="3"
        height="20"
        onMouseDown={onMouseDown}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />
      <line className="Scrubber--line" y2="100%" x1={xPercent} x2={xPercent} />
    </g>
  );
}
