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

import CanvasSpanGraph from './CanvasSpanGraph';
import SpanGraph from './index';
import TickLabels from './TickLabels';
import ViewingLayer from './ViewingLayer';
import traceGenerator from '../../../../src/demo/trace-generators';
import transformTraceData from '../../../model/transform-trace-data';
import { polyfill as polyfillAnimationFrame } from '../../../utils/test/requestAnimationFrame';

describe('<SpanGraph>', () => {
  polyfillAnimationFrame(window);

  const trace = transformTraceData(traceGenerator.trace({}));
  const props = {
    trace,
    updateViewRangeTime: () => {},
    viewRange: {
      time: {
        current: [0, 1],
      },
    },
  };

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<SpanGraph {...props} />);
  });

  it('renders a <CanvasSpanGraph />', () => {
    expect(wrapper.find(CanvasSpanGraph).length).toBe(1);
  });

  it('renders a <TickLabels />', () => {
    expect(wrapper.find(TickLabels).length).toBe(1);
  });

  it('returns a <div> if a trace is not provided', () => {
    wrapper = shallow(<SpanGraph {...props} trace={null} />);
    expect(wrapper.matchesElement(<div />)).toBeTruthy();
  });

  it('passes the number of ticks to render to components', () => {
    const tickHeader = wrapper.find(TickLabels);
    const viewingLayer = wrapper.find(ViewingLayer);
    expect(tickHeader.prop('numTicks')).toBeGreaterThan(1);
    expect(viewingLayer.prop('numTicks')).toBeGreaterThan(1);
    expect(tickHeader.prop('numTicks')).toBe(viewingLayer.prop('numTicks'));
  });

  it('passes items to CanvasSpanGraph', () => {
    const canvasGraph = wrapper.find(CanvasSpanGraph).first();
    const items = trace.spans.map(span => ({
      valueOffset: span.relativeStartTime,
      valueWidth: span.duration,
      serviceName: span.process.serviceName,
    }));
    expect(canvasGraph.prop('items')).toEqual(items);
  });
});
