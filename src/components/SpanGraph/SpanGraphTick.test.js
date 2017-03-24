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

import SpanGraphTick from './SpanGraphTick';

const timestamp = new Date().getTime() * 1000;
const defaultProps = {
  index: 0,
  initialTimestamp: timestamp,
  tick: { timestamp: timestamp + 1000000, width: 3 },
  totalDuration: 4000000,
};

it('<SpanGraphTick /> should render a <line>', () => {
  const wrapper = shallow(<SpanGraphTick {...defaultProps} />);

  expect(wrapper.find('line').length).toBe(1);
});

it('<SpanGraphTick /> should draw the line at the height of the container', () => {
  const wrapper = shallow(<SpanGraphTick {...defaultProps} />);
  const line = wrapper.find('line').first();

  expect(line.prop('y1')).toBe('0%');
  expect(line.prop('y2')).toBe('100%');
});

it('<SpanGraphTick /> should place the x value based on props', () => {
  const wrapper = shallow(<SpanGraphTick {...defaultProps} />);
  const line = wrapper.find('line').first();

  // totalDuration is 4 seconds, tick timestamp is 1 second in,
  // (tick will be a quarter of the way across)
  // container width is 100, so x is 25.

  expect(line.prop('x1')).toBe('25%');
  expect(line.prop('x2')).toBe('25%');
});

it('<SpanGraphTick /> should push the increase width if this is the initialTimestamp', () => {
  let wrapper;
  let line;

  wrapper = shallow(
    <SpanGraphTick
      {...defaultProps}
      tick={{
        ...defaultProps.tick,
        timestamp: defaultProps.initialTimestamp,
      }}
    />
  );
  line = wrapper.find('line').first();
  expect(line.prop('strokeWidth')).toBe(5);

  wrapper = shallow(
    <SpanGraphTick
      {...defaultProps}
      tick={{
        ...defaultProps.tick,
        width: 8,
        timestamp: defaultProps.initialTimestamp,
      }}
    />
  );
  line = wrapper.find('line').first();
  expect(line.prop('strokeWidth')).toBe(15);
});

it('<SpanGraphTick /> should push the x value over if this is at the totalDuration', () => {
  let wrapper;
  let line;

  wrapper = shallow(
    <SpanGraphTick
      {...defaultProps}
      tick={{
        ...defaultProps.tick,
        timestamp: defaultProps.initialTimestamp + defaultProps.totalDuration,
      }}
    />
  );
  line = wrapper.find('line').first();
  expect(line.prop('strokeWidth')).toBe(5);

  wrapper = shallow(
    <SpanGraphTick
      {...defaultProps}
      tick={{
        ...defaultProps.tick,
        width: 8,
        timestamp: defaultProps.initialTimestamp + defaultProps.totalDuration,
      }}
    />
  );
  line = wrapper.find('line').first();
  expect(line.prop('strokeWidth')).toBe(15);
});

it('<SpanGraphTick /> should spread unhandled tick properties', () => {
  const wrapper = shallow(
    <SpanGraphTick
      {...defaultProps}
      tick={{ ...defaultProps.tick, stroke: 'black' }}
    />
  );
  const line = wrapper.find('line').first();
  expect(line.prop('stroke')).toBe('black');
});

it('<SpanGraphTick /> should make the width of the tick based on the tick definition', () => {
  let wrapper;
  let line;

  wrapper = shallow(<SpanGraphTick {...defaultProps} />);
  line = wrapper.find('line').first();
  expect(line.prop('strokeWidth')).toBe(3);

  wrapper = shallow(
    <SpanGraphTick
      {...defaultProps}
      tick={{ ...defaultProps.tick, width: 8 }}
    />
  );
  line = wrapper.find('line').first();
  expect(line.prop('strokeWidth')).toBe(8);
});
