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

import ViewingLayer from './ViewingLayer';
import GraphTicks from './GraphTicks';
import Scrubber from './Scrubber';
import { polyfill as polyfillAnimationFrame } from '../../../utils/test/requestAnimationFrame';

function getViewRange(viewStart, viewEnd) {
  return {
    time: {
      current: [viewStart, viewEnd],
    },
  };
}

describe('<SpanGraph>', () => {
  polyfillAnimationFrame(window);

  const props = {
    height: 60,
    numTicks: 5,
    updateNextViewRangeTime: () => {},
    updateViewRange: () => {},
    viewRange: getViewRange(0, 1),
  };

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<ViewingLayer {...props} />);
  });

  it('renders a <GraphTicks />', () => {
    expect(wrapper.find(GraphTicks).length).toBe(1);
  });

  it('renders a filtering box if leftBound exists', () => {
    const _props = { ...props, viewRange: getViewRange(0.2, 1) };
    wrapper = shallow(<ViewingLayer {..._props} />);

    const leftBox = wrapper.find('.ViewingLayer--inactive');
    expect(leftBox.length).toBe(1);
    const width = Number(leftBox.prop('width').slice(0, -1));
    const x = leftBox.prop('x');
    expect(Math.round(width)).toBe(20);
    expect(x).toBe(0);
  });

  it('renders a filtering box if rightBound exists', () => {
    const _props = { ...props, viewRange: getViewRange(0, 0.8) };
    wrapper = shallow(<ViewingLayer {..._props} />);

    const rightBox = wrapper.find('.ViewingLayer--inactive');
    expect(rightBox.length).toBe(1);
    const width = Number(rightBox.prop('width').slice(0, -1));
    const x = Number(rightBox.prop('x').slice(0, -1));
    expect(Math.round(width)).toBe(20);
    expect(x).toBe(80);
  });

  it('renders handles for the timeRangeFilter', () => {
    const [viewStart, viewEnd] = props.viewRange.time.current;
    let scrubber = <Scrubber position={viewStart} />;
    expect(wrapper.containsMatchingElement(scrubber)).toBeTruthy();
    scrubber = <Scrubber position={viewEnd} />;
    expect(wrapper.containsMatchingElement(scrubber)).toBeTruthy();
  });
});
