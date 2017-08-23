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
import sinon from 'sinon';
import { shallow } from 'enzyme';

import SpanGraph from './SpanGraph';
import TraceSpanGraph from './TraceSpanGraph';
import SpanGraphTickHeader from './SpanGraph/SpanGraphTickHeader';
import TimelineScrubber from './TimelineScrubber';
import traceGenerator from '../../../src/demo/trace-generators';
import { transformTrace } from './TraceTimelineViewer/transforms';
import { hydrateSpansWithProcesses } from '../../selectors/trace';

describe('<TraceSpanGraph>', () => {
  const trace = hydrateSpansWithProcesses(traceGenerator.trace({}));
  const xformedTrace = transformTrace(trace);

  const props = {
    trace,
    xformedTrace,
  };

  const options = {
    context: {
      timeRangeFilter: [trace.timestamp, trace.timestamp + trace.duration],
      updateTimeRangeFilter: () => {},
    },
  };

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<TraceSpanGraph {...props} />, options);
  });

  it('renders a <SpanGraph />', () => {
    expect(wrapper.find(SpanGraph).length).toBe(1);
  });

  it('renders a <SpanGraphTickHeader />', () => {
    expect(wrapper.find(SpanGraphTickHeader).length).toBe(1);
  });

  it('returns a <div> if a trace is not provided', () => {
    wrapper = shallow(<TraceSpanGraph {...props} trace={null} />, options);
    expect(wrapper.matchesElement(<div />)).toBeTruthy();
  });

  it('renders a filtering box if leftBound exists', () => {
    const context = {
      ...options.context,
      timeRangeFilter: [trace.timestamp + 0.2 * trace.duration, trace.timestamp + trace.duration],
    };
    wrapper = shallow(<TraceSpanGraph {...props} />, { ...options, context });
    const leftBox = wrapper.find('.trace-page-timeline__graph--inactive');
    expect(leftBox.length).toBe(1);
    const width = Number(leftBox.prop('width').slice(0, -1));
    const x = leftBox.prop('x');
    expect(Math.round(width)).toBe(20);
    expect(x).toBe(0);
  });

  it('renders a filtering box if rightBound exists', () => {
    const context = {
      ...options.context,
      timeRangeFilter: [trace.timestamp, trace.timestamp + 0.8 * trace.duration],
    };
    wrapper = shallow(<TraceSpanGraph {...props} />, { ...options, context });
    const rightBox = wrapper.find('.trace-page-timeline__graph--inactive');
    const width = Number(rightBox.prop('width').slice(0, -1));
    const x = Number(rightBox.prop('x').slice(0, -1));
    expect(rightBox.length).toBe(1);
    expect(Math.round(width)).toBe(20);
    expect(Math.round(x)).toBe(80);
  });

  it('renders handles for the timeRangeFilter', () => {
    const timeRangeFilter = options.context.timeRangeFilter;
    let scrubber = <TimelineScrubber timestamp={timeRangeFilter[0]} />;
    expect(wrapper.containsMatchingElement(scrubber)).toBeTruthy();
    scrubber = <TimelineScrubber timestamp={timeRangeFilter[1]} />;
    expect(wrapper.containsMatchingElement(scrubber)).toBeTruthy();
  });

  it('calls startDragging() for the leftBound handle', () => {
    const event = { clientX: 50 };
    sinon.stub(wrapper.instance(), 'startDragging');
    wrapper.find('#trace-page-timeline__left-bound-handle').prop('onMouseDown')(event);
    expect(wrapper.instance().startDragging.calledWith('leftBound', event)).toBeTruthy();
  });

  it('calls startDragging for the rightBound handle', () => {
    const event = { clientX: 50 };
    sinon.stub(wrapper.instance(), 'startDragging');
    wrapper.find('#trace-page-timeline__right-bound-handle').prop('onMouseDown')(event);
    expect(wrapper.instance().startDragging.calledWith('rightBound', event)).toBeTruthy();
  });

  it('renders without handles if not filtering', () => {
    const context = { ...options.context, timeRangeFilter: [] };
    wrapper = shallow(<TraceSpanGraph {...props} />, { ...options, context });
    expect(wrapper.find('rect').length).toBe(0);
    expect(wrapper.find(TimelineScrubber).length).toBe(0);
  });

  it('passes the number of ticks to rendered to components', () => {
    const tickHeader = wrapper.find(SpanGraphTickHeader);
    const spanGraph = wrapper.find(SpanGraph);
    expect(tickHeader.prop('numTicks')).toBeGreaterThan(1);
    expect(spanGraph.prop('numTicks')).toBeGreaterThan(1);
    expect(tickHeader.prop('numTicks')).toBe(spanGraph.prop('numTicks'));
  });

  it('passes items to SpanGraph', () => {
    const spanGraph = wrapper.find(SpanGraph).first();
    const items = xformedTrace.spans.map(span => ({
      valueOffset: span.relativeStartTime,
      valueWidth: span.duration,
      serviceName: span.process.serviceName,
    }));
    expect(spanGraph.prop('items')).toEqual(items);
  });

  describe('# shouldComponentUpdate()', () => {
    it('returns true for new timeRangeFilter', () => {
      const state = wrapper.state();
      const context = { timeRangeFilter: [Math.random(), Math.random()] };
      const instance = wrapper.instance();
      expect(instance.shouldComponentUpdate(props, state, context)).toBe(true);
    });

    it('returns true for new trace', () => {
      const state = wrapper.state();
      const instance = wrapper.instance();
      const trace2 = hydrateSpansWithProcesses(traceGenerator.trace({}));
      const xformedTrace2 = transformTrace(trace2);
      const altProps = { trace: trace2, xformedTrace: xformedTrace2 };
      expect(instance.shouldComponentUpdate(altProps, state, options.context)).toBe(true);
    });

    it('returns true for currentlyDragging', () => {
      const state = { ...wrapper.state(), currentlyDragging: !wrapper.state('currentlyDragging') };
      const instance = wrapper.instance();
      expect(instance.shouldComponentUpdate(props, state, options.context)).toBe(true);
    });

    it('returns false, generally', () => {
      const state = wrapper.state();
      const instance = wrapper.instance();
      expect(instance.shouldComponentUpdate(props, state, options.context)).toBe(false);
    });
  });

  describe('# onMouseMove()', () => {
    it('does nothing if currentlyDragging is false', () => {
      const updateTimeRangeFilter = sinon.spy();
      const context = { ...options.context, updateTimeRangeFilter };
      wrapper = shallow(<TraceSpanGraph {...props} />, { ...options, context });
      wrapper.instance().svg = { clientWidth: 100 };
      wrapper.setState({ currentlyDragging: null });
      wrapper.instance().onMouseMove({ clientX: 45 });
      expect(wrapper.state('prevX')).toBe(null);
      expect(updateTimeRangeFilter.called).toBeFalsy();
    });

    it('stores the clientX on .state', () => {
      wrapper.instance().svg = { clientWidth: 100 };
      wrapper.setState({ currentlyDragging: 'leftBound' });
      wrapper.instance().onMouseMove({ clientX: 45 });
      expect(wrapper.state('prevX')).toBe(45);
    });

    it('updates the timeRangeFilter for the left handle', () => {
      const timestamp = trace.timestamp;
      const duration = trace.duration;
      const updateTimeRangeFilter = sinon.spy();
      const context = { ...options.context, updateTimeRangeFilter };
      wrapper = shallow(<TraceSpanGraph {...props} />, { ...options, context });
      wrapper.instance().svg = { clientWidth: 100 };
      wrapper.setState({ prevX: 0, currentlyDragging: 'leftBound' });
      wrapper.instance().onMouseMove({ clientX: 45 });
      expect(
        updateTimeRangeFilter.calledWith(timestamp + 0.45 * duration, timestamp + duration)
      ).toBeTruthy();
    });

    it('updates the timeRangeFilter for the right handle', () => {
      const timestamp = trace.timestamp;
      const duration = trace.duration;
      const updateTimeRangeFilter = sinon.spy();
      const context = { ...options.context, updateTimeRangeFilter };
      wrapper = shallow(<TraceSpanGraph {...props} />, { ...options, context });
      wrapper.instance().svg = { clientWidth: 100 };
      wrapper.setState({ prevX: 100, currentlyDragging: 'rightBound' });
      wrapper.instance().onMouseMove({ clientX: 45 });
      expect(updateTimeRangeFilter.calledWith(timestamp, timestamp + 0.45 * duration)).toBeTruthy();
    });
  });

  describe('# startDragging()', () => {
    it('stores the boundName and the prevX in state', () => {
      wrapper.instance().startDragging('leftBound', { clientX: 100 });
      expect(wrapper.state('currentlyDragging')).toBe('leftBound');
      expect(wrapper.state('prevX')).toBe(100);
    });

    it('binds event listeners to the window', () => {
      const oldFn = window.addEventListener;
      const fn = jest.fn();
      window.addEventListener = fn;

      wrapper.instance().startDragging('leftBound', { clientX: 100 });
      expect(fn.mock.calls.length).toBe(2);
      const eventNames = [fn.mock.calls[0][0], fn.mock.calls[1][0]].sort();
      expect(eventNames).toEqual(['mousemove', 'mouseup']);
      window.addEventListener = oldFn;
    });
  });

  describe('# stopDragging()', () => {
    it('TraceSpanGraph.stopDragging should clear currentlyDragging and prevX', () => {
      const instance = wrapper.instance();
      instance.startDragging('leftBound', { clientX: 100 });
      expect(wrapper.state('currentlyDragging')).toBe('leftBound');
      expect(wrapper.state('prevX')).toBe(100);
      instance.stopDragging();
      expect(wrapper.state('currentlyDragging')).toBe(null);
      expect(wrapper.state('prevX')).toBe(null);
    });
  });
});
