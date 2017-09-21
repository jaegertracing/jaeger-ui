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
import { onlyUpdateForKeys, compose, withState, withProps } from 'recompose';

import './SpanBar.css';

type SpanBarProps = {
  color: string,
  hintSide: string,
  label: string,
  onClick: (SyntheticMouseEvent<any>) => void,
  viewEnd: number,
  viewStart: number,
  rpc: {
    viewStart: number,
    viewEnd: number,
    color: string,
  },
  setLongLabel: () => void,
  setShortLabel: () => void,
};

function toPercent(value: number) {
  return `${value * 100}%`;
}

function SpanBar(props: SpanBarProps) {
  const { viewEnd, viewStart, color, label, hintSide, onClick, setLongLabel, setShortLabel, rpc } = props;

  return (
    <div className="SpanBar--wrapper" onClick={onClick} onMouseOut={setShortLabel} onMouseOver={setLongLabel}>
      <div
        aria-label={label}
        className="SpanBar--bar"
        style={{
          background: color,
          left: toPercent(viewStart),
          width: toPercent(viewEnd - viewStart),
        }}
      >
        <div className={`SpanBar--label is-${hintSide}`}>
          {label}
        </div>
      </div>
      {rpc &&
        <div
          className="SpanBar--rpc"
          style={{
            background: rpc.color,
            left: toPercent(rpc.viewStart),
            width: toPercent(rpc.viewEnd - rpc.viewStart),
          }}
        />}
    </div>
  );
}

export default compose(
  withState('label', 'setLabel', props => props.shortLabel),
  withProps(({ setLabel, shortLabel, longLabel }) => ({
    setLongLabel: () => setLabel(longLabel),
    setShortLabel: () => setLabel(shortLabel),
  })),
  onlyUpdateForKeys(['label', 'rpc', 'viewStart', 'viewEnd'])
)(SpanBar);
