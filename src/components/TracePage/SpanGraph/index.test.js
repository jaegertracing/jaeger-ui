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

import CanvasSpanGraph from './CanvasSpanGraph';
import SpanGraph from './index';
import GraphTicks from './GraphTicks';
import TickLabels from './TickLabels';
import TimelineScrubber from './Scrubber';
import traceGenerator from '../../../../src/demo/trace-generators';
import transformTraceData from '../../../model/transform-trace-data';
import { polyfill as polyfillAnimationFrame } from '../../../utils/test/requestAnimationFrame';

describe('<SpanGraph>', () => {
  polyfillAnimationFrame(window);

  const trace = transformTraceData(traceGenerator.trace({}));
  const props = { trace, viewRange: [0, 1] };
  const options = {
    context: {
      updateTimeRangeFilter: () => {},
    },
  };

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<SpanGraph {...props} />, options);
  });

  it('renders a <CanvasSpanGraph />', () => {
    expect(wrapper.find(CanvasSpanGraph).length).toBe(1);
  });

  it('renders a <TickLabels />', () => {
    expect(wrapper.find(TickLabels).length).toBe(1);
  });

  it('returns a <div> if a trace is not provided', () => {
    wrapper = shallow(<SpanGraph {...props} trace={null} />, options);
    expect(wrapper.matchesElement(<div />)).toBeTruthy();
  });

  it('renders a filtering box if leftBound exists', () => {
    const _props = { ...props, viewRange: [0.2, 1] };
    wrapper = shallow(<SpanGraph {..._props} />, options);
    const leftBox = wrapper.find('.SpanGraph--inactive');
    expect(leftBox.length).toBe(1);
    const width = Number(leftBox.prop('width').slice(0, -1));
    const x = leftBox.prop('x');
    expect(Math.round(width)).toBe(20);
    expect(x).toBe(0);
  });

  it('renders a filtering box if rightBound exists', () => {
    const _props = { ...props, viewRange: [0, 0.8] };
    wrapper = shallow(<SpanGraph {..._props} />, options);
    const rightBox = wrapper.find('.SpanGraph--inactive');
    const width = Number(rightBox.prop('width').slice(0, -1));
    const x = Number(rightBox.prop('x').slice(0, -1));
    expect(rightBox.length).toBe(1);
    expect(Math.round(width)).toBe(20);
    expect(Math.round(x)).toBe(80);
  });

  it('renders handles for the timeRangeFilter', () => {
    const { viewRange } = props;
    let scrubber = <TimelineScrubber position={viewRange[0]} />;
    expect(wrapper.containsMatchingElement(scrubber)).toBeTruthy();
    scrubber = <TimelineScrubber position={viewRange[1]} />;
    expect(wrapper.containsMatchingElement(scrubber)).toBeTruthy();
  });

  it('calls startDragging() for the leftBound handle', () => {
    const event = { clientX: 50 };
    sinon.stub(wrapper.instance(), '_startDragging');
    wrapper.find('#trace-page-timeline__left-bound-handle').prop('onMouseDown')(event);
    expect(wrapper.instance()._startDragging.calledWith('leftBound', event)).toBeTruthy();
  });

  it('calls startDragging for the rightBound handle', () => {
    const event = { clientX: 50 };
    sinon.stub(wrapper.instance(), '_startDragging');
    wrapper.find('#trace-page-timeline__right-bound-handle').prop('onMouseDown')(event);
    expect(wrapper.instance()._startDragging.calledWith('rightBound', event)).toBeTruthy();
  });

  it('passes the number of ticks to render to components', () => {
    const tickHeader = wrapper.find(TickLabels);
    const graphTicks = wrapper.find(GraphTicks);
    expect(tickHeader.prop('numTicks')).toBeGreaterThan(1);
    expect(graphTicks.prop('numTicks')).toBeGreaterThan(1);
    expect(tickHeader.prop('numTicks')).toBe(graphTicks.prop('numTicks'));
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

  describe('# shouldComponentUpdate()', () => {
    it('returns true for new timeRangeFilter', () => {
      const state = { ...wrapper.state(), leftBound: Math.random(), rightBound: Math.random() };
      const instance = wrapper.instance();
      expect(instance.shouldComponentUpdate(props, state, options.context)).toBe(true);
    });

    it('returns true for new trace', () => {
      const state = wrapper.state();
      const instance = wrapper.instance();
      const trace2 = transformTraceData(traceGenerator.trace({}));
      const altProps = { trace: trace2 };
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
      wrapper = shallow(<SpanGraph {...props} />, { ...options, context });
      wrapper.instance()._onMouseMove({ clientX: 45 });
      expect(wrapper.state('prevX')).toBe(null);
      expect(updateTimeRangeFilter.called).toBeFalsy();
    });

    it('stores the clientX on .state', () => {
      wrapper.instance()._wrapper = { clientWidth: 100 };
      wrapper.setState({ currentlyDragging: 'leftBound' });
      wrapper.instance()._onMouseMove({ clientX: 45 });
      expect(wrapper.state('prevX')).toBe(45);
    });

    it('updates the timeRangeFilter for the left handle', () => {
      const updateTimeRangeFilter = sinon.spy();
      const context = { ...options.context, updateTimeRangeFilter };
      wrapper = shallow(<SpanGraph {...props} />, { ...options, context });
      wrapper.instance()._wrapper = { clientWidth: 100 };
      const [leftBound, rightBound] = props.viewRange;
      const state = { ...wrapper.state(), leftBound, rightBound, prevX: 0, currentlyDragging: 'leftBound' };
      wrapper.setState(state);
      wrapper.instance()._onMouseMove({ clientX: 45 });
      wrapper.instance()._publishTimeRange();
      expect(updateTimeRangeFilter.calledWith(0.45, 1)).toBeTruthy();
    });

    it('updates the timeRangeFilter for the right handle', () => {
      const updateTimeRangeFilter = sinon.spy();
      const context = { ...options.context, updateTimeRangeFilter };
      wrapper = shallow(<SpanGraph {...props} />, { ...options, context });
      wrapper.instance()._wrapper = { clientWidth: 100 };
      const [leftBound, rightBound] = props.viewRange;
      const state = {
        ...wrapper.state(),
        leftBound,
        rightBound,
        prevX: 100,
        currentlyDragging: 'rightBound',
      };
      wrapper.setState(state);
      wrapper.instance()._onMouseMove({ clientX: 45 });
      wrapper.instance()._publishTimeRange();
      expect(updateTimeRangeFilter.calledWith(0, 0.45)).toBeTruthy();
    });
  });

  describe('# _startDragging()', () => {
    it('stores the boundName and the prevX in state', () => {
      wrapper.instance()._startDragging('leftBound', { clientX: 100 });
      expect(wrapper.state('currentlyDragging')).toBe('leftBound');
      expect(wrapper.state('prevX')).toBe(100);
    });

    it('binds event listeners to the window', () => {
      const oldFn = window.addEventListener;
      const fn = jest.fn();
      window.addEventListener = fn;

      wrapper.instance()._startDragging('leftBound', { clientX: 100 });
      expect(fn.mock.calls.length).toBe(2);
      const eventNames = [fn.mock.calls[0][0], fn.mock.calls[1][0]].sort();
      expect(eventNames).toEqual(['mousemove', 'mouseup']);
      window.addEventListener = oldFn;
    });
  });

  describe('# _stopDragging()', () => {
    it('clears currentlyDragging and prevX', () => {
      const instance = wrapper.instance();
      instance._startDragging('leftBound', { clientX: 100 });
      expect(wrapper.state('currentlyDragging')).toBe('leftBound');
      expect(wrapper.state('prevX')).toBe(100);
      instance._stopDragging();
      expect(wrapper.state('currentlyDragging')).toBe(null);
      expect(wrapper.state('prevX')).toBe(null);
    });
  });
});
