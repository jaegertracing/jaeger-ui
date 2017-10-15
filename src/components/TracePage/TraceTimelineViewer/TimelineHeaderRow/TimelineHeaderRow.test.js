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

import TimelineHeaderRow from './TimelineHeaderRow';
import TimelineColumnResizer from './TimelineColumnResizer';
import TimelineViewingLayer from './TimelineViewingLayer';
import Ticks from '../Ticks';

describe('<TimelineHeaderRow>', () => {
  let wrapper;

  const nameColumnWidth = 0.25;
  const props = {
    nameColumnWidth,
    duration: 1234,
    numTicks: 5,
    onColummWidthChange: () => {},
    updateNextViewRangeTime: () => {},
    updateViewRange: () => {},
    viewRangeTime: {
      current: [0.1, 0.9],
    },
  };

  beforeEach(() => {
    wrapper = shallow(<TimelineHeaderRow {...props} />);
  });

  it('renders without exploding', () => {
    expect(wrapper).toBeDefined();
    expect(wrapper.find('.TimelineHeaderRow').length).toBe(1);
  });

  it('propagates the name column width', () => {
    const nameCol = wrapper.find({ width: nameColumnWidth });
    const timelineCol = wrapper.find({ width: 1 - nameColumnWidth });
    expect(nameCol.length).toBe(1);
    expect(timelineCol.length).toBe(1);
  });

  it('renders the title', () => {
    expect(wrapper.find('h3').text()).toMatch(/Service.*?Operation/);
  });

  it('renders the TimelineViewingLayer', () => {
    const elm = (
      <TimelineViewingLayer
        boundsInvalidator={nameColumnWidth}
        updateNextViewRangeTime={props.updateNextViewRangeTime}
        updateViewRange={props.updateViewRange}
        viewRangeTime={props.viewRangeTime}
      />
    );
    expect(wrapper.containsMatchingElement(elm)).toBe(true);
  });

  it('renders the Ticks', () => {
    const [viewStart, viewEnd] = props.viewRangeTime.current;
    const elm = (
      <Ticks
        numTicks={props.numTicks}
        startTime={viewStart * props.duration}
        endTime={viewEnd * props.duration}
        showLabels
      />
    );
    expect(wrapper.containsMatchingElement(elm)).toBe(true);
  });

  it('renders the TimelineColumnResizer', () => {
    const elm = (
      <TimelineColumnResizer
        position={nameColumnWidth}
        onChange={props.onColummWidthChange}
        min={0.15}
        max={0.85}
      />
    );
    expect(wrapper.containsMatchingElement(elm)).toBe(true);
  });
});
