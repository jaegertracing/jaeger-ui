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

import SpanGraph from '../SpanGraph';
import TracePageTimeline from './TracePageTimeline';
import SpanGraphTickHeader from '../SpanGraph/SpanGraphTickHeader';
import TimelineScrubber from './TimelineScrubber';
import traceGenerator from '../../../src/demo/trace-generators';

const listeners = {};
const addEventListener = sinon.spy((name, fn) => Object.assign(listeners, { [name]: fn }));
const removeEventListener = sinon.spy((name, fn) => Object.assign(listeners, { [name]: fn }));
const clearListeners = () =>
  Object.keys(listeners).forEach(key => {
    delete listeners[key];
  });

const timestamp = new Date().getTime() * 1000;
const defaultProps = {
  trace: {
    traceID: 'trace-id',
    spans: [
      {
        spanID: 'spanID-2',
        traceID: 'trace-id',
        startTime: timestamp + 10000,
        duration: 10000,
        operationName: 'whatever',
        process: {
          serviceName: 'my-other-service',
        },
      },
      {
        spanID: 'spanID-3',
        traceID: 'trace-id',
        startTime: timestamp + 20000,
        duration: 10000,
        operationName: 'bob',
        process: {
          serviceName: 'my-service',
        },
      },
      {
        spanID: 'spanID-1',
        traceID: 'trace-id',
        startTime: timestamp,
        duration: 50000,
        operationName: 'whatever',
        process: {
          serviceName: 'my-service',
        },
      },
    ],
  },
};

const defaultOptions = {
  context: {
    timeRangeFilter: [timestamp, timestamp + 50000],
    updateTimeRangeFilter: () => {},
  },
};

it('<TracePageTimeline /> should render a <SpanGraph />', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, defaultOptions);

  expect(wrapper.find(SpanGraph).length).toBe(1);
});

it('<TracePageTimeline /> should render a <SpanGraphTickHeader />', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, defaultOptions);

  expect(wrapper.find(SpanGraphTickHeader).length).toBe(1);
});

it('<TracePageTimeline /> should just return a <div /> if no trace is present', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} trace={null} />, defaultOptions);

  expect(wrapper.matchesElement(<div />)).toBeTruthy();
});

it('<TracePageTimeline /> should render a filtering box if leftBound exists', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, {
    ...defaultOptions,
    context: {
      ...defaultOptions.context,
      timeRangeFilter: [timestamp + 10000, timestamp + 50000],
    },
  });

  expect(
    wrapper.containsMatchingElement(
      <rect className="trace-page-timeline__graph--inactive" x={0} y={0} height="100%" width="20%" />
    )
  ).toBeTruthy();
});

it('<TracePageTimeline /> should render a filtering box if rightBound exists', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, {
    ...defaultOptions,
    context: {
      ...defaultOptions.context,
      timeRangeFilter: [timestamp, timestamp + 40000],
    },
  });

  expect(
    wrapper.containsMatchingElement(
      <rect className="trace-page-timeline__graph--inactive" x="80%" y={0} height="100%" width="20%" />
    )
  ).toBeTruthy();
});

it('<TracePageTimeline /> should render handles for the timeRangeFilter', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, defaultOptions);

  expect(
    wrapper.containsMatchingElement(
      <TimelineScrubber timestamp={defaultOptions.context.timeRangeFilter[0]} />
    )
  ).toBeTruthy();
  expect(
    wrapper.containsMatchingElement(
      <TimelineScrubber timestamp={defaultOptions.context.timeRangeFilter[1]} />
    )
  ).toBeTruthy();
});

it('<TracePageTimeline /> should call startDragging for the leftBound handle', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, defaultOptions);
  const event = { clientX: 50 };

  sinon.stub(wrapper.instance(), 'startDragging');

  wrapper.find('#trace-page-timeline__left-bound-handle').prop('onMouseDown')(event);

  expect(wrapper.instance().startDragging.calledWith('leftBound', event)).toBeTruthy();
});

it('<TracePageTimeline /> should call startDragging for the rightBound handle', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, defaultOptions);
  const event = { clientX: 50 };

  sinon.stub(wrapper.instance(), 'startDragging');

  wrapper.find('#trace-page-timeline__right-bound-handle').prop('onMouseDown')(event);

  expect(wrapper.instance().startDragging.calledWith('rightBound', event)).toBeTruthy();
});

it('<TracePageTimeline /> should render without handles if no filtering', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, {
    ...defaultOptions,
    context: {
      ...defaultOptions.context,
      timeRangeFilter: [],
    },
  });

  expect(wrapper.find('rect').length).toBe(0);
  expect(wrapper.find(TimelineScrubber).length).toBe(0);
});

it('<TracePageTimeline /> should timeline-sort the trace before rendering', () => {
  // manually sort the spans in the defaultProps.
  const sortedTraceSpans = [
    defaultProps.trace.spans[2],
    defaultProps.trace.spans[0],
    defaultProps.trace.spans[1],
  ];

  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, defaultOptions);
  const spanGraph = wrapper.find(SpanGraph).first();

  expect(spanGraph.prop('spans')).toEqual(sortedTraceSpans);
});

it('<TracePageTimeline /> should create ticks and pass them to components', () => {
  // manually build a ticks object for the trace
  const ticks = [
    { timestamp, width: 2 },
    { timestamp: timestamp + 10000, width: 2 },
    { timestamp: timestamp + 20000, width: 2 },
    { timestamp: timestamp + 30000, width: 2 },
    { timestamp: timestamp + 40000, width: 2 },
    { timestamp: timestamp + 50000, width: 2 },
  ];

  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, defaultOptions);
  const spanGraph = wrapper.find(SpanGraph).first();
  const spanGraphTickHeader = wrapper.find(SpanGraphTickHeader).first();

  expect(spanGraph.prop('ticks')).toEqual(ticks);
  expect(spanGraphTickHeader.prop('ticks')).toEqual(ticks);
});

it('<TracePageTimeline /> should calculate the rowHeight', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, defaultOptions);
  const spanGraph = wrapper.find(SpanGraph).first();

  expect(spanGraph.prop('rowHeight')).toBe(50 / 3);
});

it('<TracePageTimeline /> should pass the props through to SpanGraph', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, defaultOptions);
  const spanGraph = wrapper.find(SpanGraph).first();

  expect(spanGraph.prop('rowPadding')).toBe(0);
});

it('<TracePageTimeline /> should pass the props through to SpanGraphTickHeader', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, defaultOptions);
  const spanGraphTickHeader = wrapper.find(SpanGraphTickHeader).first();

  expect(spanGraphTickHeader.prop('trace')).toEqual(defaultProps.trace);
});

it('TracePageTimeline.shouldComponentUpdate should return true for new timeRange', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, defaultOptions);

  expect(
    wrapper.instance().shouldComponentUpdate(defaultProps, wrapper.state(), {
      timeRangeFilter: [timestamp, timestamp + 10000],
    })
  ).toBe(true);
});

it('TracePageTimeline.shouldComponentUpdate should return true for new traces', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, defaultOptions);

  expect(
    wrapper
      .instance()
      .shouldComponentUpdate(
        { ...defaultProps, trace: traceGenerator.trace({ numberOfSpans: 45 }) },
        wrapper.state(),
        defaultOptions.context
      )
  ).toBe(true);
});

it('TracePageTimeline.shouldComponentUpdate should return true for currentlyDragging', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, defaultOptions);

  expect(
    wrapper.instance().shouldComponentUpdate(
      defaultProps,
      {
        ...wrapper.state(),
        currentlyDragging: !wrapper.state('currentlyDragging'),
      },
      defaultOptions.context
    )
  ).toBe(true);
});

it('TracePageTimeline.shouldComponentUpdate should return false otherwise', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, defaultOptions);

  expect(
    wrapper.instance().shouldComponentUpdate(defaultProps, wrapper.state(), defaultOptions.context)
  ).toBe(false);
});

it('TracePageTimeline.onMouseMove should do nothing if currentlyDragging is false', () => {
  const updateTimeRangeFilter = sinon.spy();
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, {
    ...defaultOptions,
    context: {
      ...defaultOptions.context,
      updateTimeRangeFilter,
    },
  });

  wrapper.instance().svg = { clientWidth: 100 };
  wrapper.setState({ currentlyDragging: null });

  wrapper.instance().onMouseMove({ clientX: 45 });

  expect(wrapper.state('prevX')).toBe(null);
  expect(updateTimeRangeFilter.called).toBeFalsy();
});

it('TracePageTimeline.onMouseMove should store the clientX on the state', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, defaultOptions);

  wrapper.instance().svg = { clientWidth: 100 };
  wrapper.setState({ currentlyDragging: 'leftBound' });

  wrapper.instance().onMouseMove({ clientX: 45 });

  expect(wrapper.state('prevX')).toBe(45);
});

it('TracePageTimeline.onMouseMove should update the timeRangeFilter for the left handle', () => {
  const updateTimeRangeFilter = sinon.spy();
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, {
    ...defaultOptions,
    context: {
      ...defaultOptions.context,
      updateTimeRangeFilter,
    },
  });

  wrapper.instance().svg = { clientWidth: 100 };
  wrapper.setState({ prevX: 0, currentlyDragging: 'leftBound' });

  wrapper.instance().onMouseMove({ clientX: 45 });

  expect(updateTimeRangeFilter.calledWith(timestamp + 22500, timestamp + 50000)).toBeTruthy();
});

it('TracePageTimeline.onMouseMove should update the timeRangeFilter for the right handle', () => {
  const updateTimeRangeFilter = sinon.spy();
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, {
    ...defaultOptions,
    context: {
      ...defaultOptions.context,
      updateTimeRangeFilter,
    },
  });

  wrapper.instance().svg = { clientWidth: 100 };
  wrapper.setState({ prevX: 100, currentlyDragging: 'rightBound' });

  wrapper.instance().onMouseMove({ clientX: 45 });

  expect(updateTimeRangeFilter.calledWith(timestamp, timestamp + 22500)).toBeTruthy();
});

it('TracePageTimeline.startDragging should store the boundName and the prevX in state', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, defaultOptions);

  wrapper.instance().startDragging('leftBound', { clientX: 100 });

  expect(wrapper.state('currentlyDragging')).toBe('leftBound');
  expect(wrapper.state('prevX')).toBe(100);
});

// TODO: Need to figure out how to mock to window events.
it.skip('TracePageTimeline.startDragging should bind event listeners to the window', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, defaultOptions);

  clearListeners();

  wrapper.instance().startDragging('leftBound', { clientX: 100 });

  expect(addEventListener.calledWith('mousemove', sinon.match.func)).toBeTruthy();
  expect(addEventListener.calledWith('mouseup', sinon.match.func)).toBeTruthy();
});

it.skip('TracePageTimeline.startDragging should call onMouseMove on the window', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, defaultOptions);

  clearListeners();

  wrapper.instance().startDragging('leftBound', { clientX: 100 });
  sinon.stub(wrapper.instance(), 'onMouseMove');

  const event = { clientX: 99 };
  listeners.mousemove(event);

  expect(wrapper.instance().onMouseMove.calledWith(event)).toBeTruthy();
});

it.skip('TracePageTimeline.startDragging mouseup should call stopDragging', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, defaultOptions);

  clearListeners();

  wrapper.instance().startDragging('leftBound', { clientX: 100 });
  sinon.stub(wrapper.instance(), 'stopDragging');

  const event = { clientX: 99 };
  listeners.mouseup(event);

  expect(wrapper.instance().stopDragging.called).toBeTruthy();
});

it.skip('TracePageTimeline.startDragging mouseup should stop listening to the events', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, defaultOptions);

  clearListeners();

  wrapper.instance().startDragging('leftBound', { clientX: 100 });

  const event = { clientX: 99 };
  listeners.mouseup(event);

  expect(removeEventListener.calledWith('mousemove', sinon.match.func)).toBeTruthy();
  expect(removeEventListener.calledWith('mouseup', sinon.match.func)).toBeTruthy();
});

it('TracePageTimeline.stopDragging should clear currentlyDragging and prevX', () => {
  const wrapper = shallow(<TracePageTimeline {...defaultProps} />, defaultOptions);

  wrapper.instance().stopDragging();

  expect(wrapper.state('currentlyDragging')).toBe(null);
  expect(wrapper.state('prevX')).toBe(null);
});
