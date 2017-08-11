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

import './grid.css';
import './index.css';
import { clampValue } from './utils';

const clampPercent = clampValue.bind(null, 0, 100);

function SpanBarInternal(props) {
  const {
    startPercent,
    endPercent,
    color,
    label,
    enableTransition,
    onClick,
    onMouseOver,
    onMouseOut,
    childInterval,
  } = props;
  const barWidth = endPercent - startPercent;
  const barHeightPercent = 50;
  return (
    <div
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
      onClick={onClick}
      style={{
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
      }}
    >
      <div
        className="span-row__bar hint--right hint--always"
        aria-label={label}
        style={{
          transition: enableTransition ? 'width 500ms' : undefined,
          borderRadius: 3,
          position: 'absolute',
          display: 'inline-block',
          backgroundColor: color,
          top: `${(100 - barHeightPercent) / 2}%`,
          height: `${barHeightPercent}%`,
          width: `${clampPercent(barWidth)}%`,
          left: `${clampPercent(startPercent)}%`,
        }}
      >
        {childInterval &&
          <div
            style={{
              position: 'absolute',
              backgroundColor: childInterval.color,
              left: `${clampPercent(childInterval.startPercent)}%`,
              right: `${100 - clampPercent(childInterval.endPercent)}%`,
              top: '20%',
              bottom: '20%',
            }}
          />}
      </div>
    </div>
  );
}

SpanBarInternal.defaultProps = {
  enableTransition: true,
};

SpanBarInternal.propTypes = {
  childInterval: PropTypes.shape({
    startPercent: PropTypes.number,
    endPercent: PropTypes.number,
    color: PropTypes.string,
  }),
  enableTransition: PropTypes.bool,
  startPercent: PropTypes.number.isRequired,
  endPercent: PropTypes.number.isRequired,
  color: PropTypes.string,
  label: PropTypes.string,
  onClick: PropTypes.func,
  onMouseOver: PropTypes.func,
  onMouseOut: PropTypes.func,
};

const SpanBar = compose(
  withState('label', 'setLabel', props => props.shortLabel),
  withProps(({ setLabel, shortLabel, longLabel }) => ({
    onMouseOver: () => setLabel(longLabel),
    onMouseOut: () => setLabel(shortLabel),
  })),
  onlyUpdateForKeys(['startPercent', 'endPercent', 'label', 'childInterval'])
)(SpanBarInternal);

export default SpanBar;
