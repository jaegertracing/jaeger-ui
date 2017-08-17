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

describe('<SpanGraphTickHeader>', () => {
  const defaultProps = {
    numTicks: 4,
    duration: 5000,
  };

  let wrapper;
  let ticks;

  beforeEach(() => {
    wrapper = shallow(<SpanGraphTickHeader {...defaultProps} />);
    ticks = wrapper.find('[data-test="tick"]');
  });

  it('renders the right number of ticks', () => {
    expect(ticks.length).toBe(defaultProps.numTicks + 1);
  });

  it('places the first tick on the left', () => {
    const firstTick = ticks.first();
    expect(firstTick.prop('style')).toEqual({ left: '0%' });
  });

  it('places the last tick on the right', () => {
    const lastTick = ticks.last();
    expect(lastTick.prop('style')).toEqual({ right: '0%' });
  });

  it('places middle ticks at proper intervals', () => {
    const positions = ['25%', '50%', '75%'];
    positions.forEach((pos, i) => {
      const tick = ticks.at(i + 1);
      expect(tick.prop('style')).toEqual({ left: pos });
    });
  });

  it("doesn't explode if no trace is present", () => {
    expect(() => shallow(<SpanGraphTickHeader {...defaultProps} trace={null} />)).not.toThrow();
  });
});
