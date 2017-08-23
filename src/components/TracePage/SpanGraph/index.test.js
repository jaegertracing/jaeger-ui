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

import SpanGraph from './';

describe('<SpanGraph>', () => {
  const defaultProps = {
    items: [
      { valueWidth: 100, valueOffset: 25, serviceName: 'a' },
      { valueWidth: 100, valueOffset: 50, serviceName: 'b' },
    ],
    valueWidth: 200,
    numTicks: 4,
  };

  let itemsG;
  let ticksG;

  beforeEach(() => {
    const wrapper = shallow(<SpanGraph {...defaultProps} />);
    itemsG = wrapper.find('[data-test="span-items"]');
    ticksG = wrapper.find('[data-test="ticks"]');
  });

  it('renders a <g>', () => {
    expect(itemsG.length).toBe(1);
  });

  it('calculates the height of rects based on the number of items', () => {
    const rect = itemsG.find('rect').first();
    expect(rect).toBeDefined();
    expect(rect.prop('height')).toBe('50%');
  });

  it('creates a <g> for ticks', () => {
    expect(ticksG.length).toBe(1);
  });

  it('creates a line for each ticks excluding the first and last', () => {
    expect(ticksG.find('line').length).toBe(defaultProps.numTicks - 1);
  });

  it('creates a rect for each item in the items prop', () => {
    expect(itemsG.find('rect').length).toBe(defaultProps.items.length);
  });
});
