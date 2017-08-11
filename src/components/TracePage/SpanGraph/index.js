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

import colorGenerator from '../../../utils/color-generator';

import './SpanGraph.css';

const MIN_SPAN_WIDTH = 0.002;

export default function SpanGraph(props) {
  const { valueWidth: totalValueWidth, numTicks, items } = props;

  const itemHeight = 1 / items.length * 100;

  const ticks = [];
  for (let i = 0; i < numTicks + 1; i++) {
    const x = `${i / numTicks * 100}%`;
    ticks.push(<line className="span-graph--tick" x1={x} y1="0%" x2={x} y2="100%" key={i / numTicks} />);
  }

  const spanItems = items.map((item, i) => {
    const { valueWidth, valueOffset, serviceName } = item;
    const key = `span-graph-${i}`;
    const fill = colorGenerator.getColorByKey(serviceName);
    const width = `${Math.max(valueWidth / totalValueWidth, MIN_SPAN_WIDTH) * 100}%`;
    return (
      <rect
        key={key}
        className="span-graph--span-rect"
        height={`${itemHeight}%`}
        style={{ fill }}
        width={width}
        x={`${valueOffset / totalValueWidth * 100}%`}
        y={`${i / items.length * 100}%`}
      />
    );
  });

  return (
    <g>
      <g aria-hidden="true">
        {ticks}
      </g>
      <g>
        {spanItems}
      </g>
    </g>
  );
}

SpanGraph.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      valueWidth: PropTypes.number.isRequired,
      valueOffset: PropTypes.number.isRequired,
      serviceName: PropTypes.string.isRequired,
    })
  ).isRequired,
  numTicks: PropTypes.number.isRequired,
  valueWidth: PropTypes.number.isRequired,
};
