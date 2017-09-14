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
import { onlyUpdateForKeys, compose, withState, withProps } from 'recompose';

import './SpanBar.css';

function toPercent(value) {
  return `${value * 100}%`;
}

function SpanBar(props) {
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

SpanBar.propTypes = {
  color: PropTypes.string.isRequired,
  hintSide: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  viewEnd: PropTypes.number.isRequired,
  viewStart: PropTypes.number.isRequired,
  rpc: PropTypes.shape({
    viewStart: PropTypes.number,
    viewEnd: PropTypes.number,
    color: PropTypes.string,
  }),
  setLongLabel: PropTypes.func,
  setShortLabel: PropTypes.func,
};

SpanBar.defaultProps = {
  rpc: null,
  onClick: null,
  onMouseOver: null,
  onMouseOut: null,
};

export default compose(
  withState('label', 'setLabel', props => props.shortLabel),
  withProps(({ setLabel, shortLabel, longLabel }) => ({
    setLongLabel: () => setLabel(longLabel),
    setShortLabel: () => setLabel(shortLabel),
  })),
  onlyUpdateForKeys(['label', 'rpc', 'viewStart', 'viewEnd'])
)(SpanBar);
