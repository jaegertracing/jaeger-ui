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
import { shallow } from 'enzyme';

import SpanGraph from '.';

import SpanGraphTick from './SpanGraphTick';
import SpanGraphSpan from './SpanGraphSpan';
import { getTicksForTrace } from '../../selectors/trace';

const initialTimestamp = new Date().getTime() * 1000;
const trace = {
  traceID: 'trace-id',
  spans: [
    {
      spanID: 'span-id',
      traceID: 'trace-id',
      startTime: initialTimestamp,
      duration: 1000000,
    },
    {
      spanID: 'span-id',
      traceID: 'trace-id',
      startTime: initialTimestamp + 200,
      duration: 10000,
    },
  ],
};
const ticks = getTicksForTrace({ trace });
const defaultProps = {
  rowHeight: 10,
  rowPadding: 1,
  ticks,
  trace,
  width: 500,
};

it('<SpanGraph /> should render an <svg>', () => {
  const wrapper = shallow(<SpanGraph {...defaultProps} />);

  expect(wrapper.find('svg').length).toBe(1);
});

it('<SpanGraph /> should set the width', () => {
  const wrapper = shallow(<SpanGraph {...defaultProps} />);
  const svg = wrapper.find('svg').first();

  expect(svg.prop('width')).toBe(defaultProps.width);
});

it('<SpanGraph /> should calculate the height based on the rowHeight and rowPadding', () => {
  const wrapper = shallow(<SpanGraph {...defaultProps} />);
  const svg = wrapper.find('svg').first();

  // (10 + 2) * 2
  expect(svg.prop('height')).toBe(24);
});

it('<SpanGraph /> should create <SpanGraphTick />s for the ticks', () => {
  const wrapper = shallow(<SpanGraph {...defaultProps} />);
  const ticksWrapper = wrapper.find(SpanGraphTick);

  expect(ticksWrapper.length).toBe(ticks.length);
});

it('<SpanGraph /> should create <SpanGraphSpan />s for the spans', () => {
  const wrapper = shallow(<SpanGraph {...defaultProps} />);
  const spansWrapper = wrapper.find(SpanGraphSpan);

  expect(spansWrapper.length).toBe(trace.spans.length);
});

it('<SpanGraphSpan /> should attach "onSomethingSpan" handlers with to the spans', () => {
  function onClick() {
    // just checking to see that we got in here
    expect(true).toBeTruthy();
  }

  const wrapper = shallow(<SpanGraph {...defaultProps} onClickSpan={onClick} />);

  wrapper.find(SpanGraphSpan).first().props().onClick();
});

it('<SpanGraphSpan /> should spread unmatched props onto the rect', () => {
  const onClick = () => {};

  const wrapper = shallow(<SpanGraph {...defaultProps} onClick={onClick} />);

  const svg = wrapper.find('svg').first();

  expect(svg.prop('onClick')).toBe(onClick);
});
