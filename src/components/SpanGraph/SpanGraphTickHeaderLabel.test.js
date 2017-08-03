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

import SpanGraphTickHeaderLabel from './SpanGraphTickHeaderLabel';
import { formatDurationForTrace } from '../../selectors/trace';

const timestamp = new Date().getTime() * 1000;
const duration = 1000000;
const trace = {
  spans: [
    {
      duration: 4000000,
      timestamp,
    },
  ],
};
const defaultProps = {
  style: { left: 100 },
  duration,
  trace,
};

it('<SpanGraphTickHeaderLabel /> should render a <div>', () => {
  const wrapper = shallow(<SpanGraphTickHeaderLabel {...defaultProps} />);
  const divs = wrapper.find('div');

  expect(divs.length).toBe(1);
});

it('<SpanGraphTickHeaderLabel /> should render the duration as text', () => {
  const wrapper = shallow(<SpanGraphTickHeaderLabel {...defaultProps} />);
  const div = wrapper.find('div').first();

  expect(div.prop('children')).toBe(formatDurationForTrace({ trace, duration }));
});

it('<SpanGraphTickHeaderLabel /> should pass the style through', () => {
  const wrapper = shallow(<SpanGraphTickHeaderLabel {...defaultProps} />);
  const firstTick = wrapper.find('div').first();

  expect(firstTick.prop('style')).toEqual(defaultProps.style);
});
