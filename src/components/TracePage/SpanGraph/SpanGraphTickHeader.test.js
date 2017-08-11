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

import SpanGraphTickHeader from './SpanGraphTickHeader';
import SpanGraphTickHeaderLabel from './SpanGraphTickHeaderLabel';

const timestamp = new Date().getTime() * 1000;
const defaultProps = {
  ticks: [
    { timestamp },
    { timestamp: timestamp + 1000000 },
    { timestamp: timestamp + 2000000 },
    { timestamp: timestamp + 3000000 },
    { timestamp: timestamp + 4000000 },
  ],
  trace: {
    spans: [
      {
        duration: 4000000,
        startTime: timestamp,
      },
    ],
  },
};

it('<SpanGraphTickHeader /> should render the right number of ticks', () => {
  const wrapper = shallow(<SpanGraphTickHeader {...defaultProps} />);
  const ticks = wrapper.find(SpanGraphTickHeaderLabel);

  expect(ticks.length).toBe(defaultProps.ticks.length);
});

it('<SpanGraphTickHeader /> should place the first tick on the left', () => {
  const wrapper = shallow(<SpanGraphTickHeader {...defaultProps} />);
  const firstTick = wrapper.find(SpanGraphTickHeaderLabel).first();

  expect(firstTick.prop('style')).toEqual({ left: '0%' });
});

it('<SpanGraphTickHeader /> should place the last tick on the right', () => {
  const wrapper = shallow(<SpanGraphTickHeader {...defaultProps} />);
  const lastTick = wrapper.find(SpanGraphTickHeaderLabel).last();

  expect(lastTick.prop('style')).toEqual({ right: '0%' });
});

it('<SpanGraphTickHeader /> should place the middle ticks at proper intervals', () => {
  const wrapper = shallow(<SpanGraphTickHeader {...defaultProps} />);
  const ticks = wrapper.find(SpanGraphTickHeaderLabel);

  expect(ticks.at(1).prop('style')).toEqual({ left: '25%' });

  expect(ticks.at(2).prop('style')).toEqual({ left: '50%' });

  expect(ticks.at(3).prop('style')).toEqual({ left: '75%' });
});

it('<SpanGraphTickHeader /> should not explode if no trace is present', () => {
  expect(() => shallow(<SpanGraphTickHeader {...defaultProps} trace={null} />)).not.toThrow();
});
