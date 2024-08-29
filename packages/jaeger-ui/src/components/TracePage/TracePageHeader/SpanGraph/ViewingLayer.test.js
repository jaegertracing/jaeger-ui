// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { shallow } from 'enzyme';
import React from 'react';

import GraphTicks from './GraphTicks';
import Scrubber from './Scrubber';
import ViewingLayer, { dragTypes } from './ViewingLayer';
import { EUpdateTypes } from '../../../../utils/DraggableManager';
import { polyfill as polyfillAnimationFrame } from '../../../../utils/test/requestAnimationFrame';

function getViewRange(viewStart, viewEnd) {
  return {
    time: {
      current: [viewStart, viewEnd],
    },
  };
}

describe('<ViewingLayer>', () => {
  polyfillAnimationFrame(window);

  let props;
  let wrapper;

  beforeEach(() => {
    props = {
      height: 60,
      numTicks: 5,
      updateNextViewRangeTime: jest.fn(),
      updateViewRangeTime: jest.fn(),
      viewRange: getViewRange(0, 1),
    };
    wrapper = shallow(<ViewingLayer {...props} />);
  });

  describe('_getDraggingBounds()', () => {
    beforeEach(() => {
      props = { ...props, viewRange: getViewRange(0.1, 0.9) };
      wrapper = shallow(<ViewingLayer {...props} />);
      wrapper.instance()._setRoot({
        getBoundingClientRect() {
          return { left: 10, width: 100 };
        },
      });
    });

    it('throws if _root is not set', () => {
      const instance = wrapper.instance();
      instance._root = null;
      expect(() => instance._getDraggingBounds(dragTypes.REFRAME)).toThrow();
    });

    it('returns the correct bounds for reframe', () => {
      const bounds = wrapper.instance()._getDraggingBounds(dragTypes.REFRAME);
      expect(bounds).toEqual({
        clientXLeft: 10,
        width: 100,
        maxValue: 1,
        minValue: 0,
      });
    });

    it('returns the correct bounds for shiftStart', () => {
      const bounds = wrapper.instance()._getDraggingBounds(dragTypes.SHIFT_START);
      expect(bounds).toEqual({
        clientXLeft: 10,
        width: 100,
        maxValue: 0.9,
        minValue: 0,
      });
    });

    it('returns the correct bounds for shiftEnd', () => {
      const bounds = wrapper.instance()._getDraggingBounds(dragTypes.SHIFT_END);
      expect(bounds).toEqual({
        clientXLeft: 10,
        width: 100,
        maxValue: 1,
        minValue: 0.1,
      });
    });
  });

  describe('DraggableManager callbacks', () => {
    describe('reframe', () => {
      it('handles mousemove', () => {
        const value = 0.5;
        wrapper.instance()._handleReframeMouseMove({ value });
        const calls = props.updateNextViewRangeTime.mock.calls;
        expect(calls).toEqual([[{ cursor: value }]]);
      });

      it('handles mouseleave', () => {
        wrapper.instance()._handleReframeMouseLeave();
        const calls = props.updateNextViewRangeTime.mock.calls;
        expect(calls).toEqual([[{ cursor: null }]]);
      });

      describe('drag update', () => {
        it('handles sans anchor', () => {
          const value = 0.5;
          wrapper.instance()._handleReframeDragUpdate({ value });
          const calls = props.updateNextViewRangeTime.mock.calls;
          expect(calls).toEqual([[{ reframe: { anchor: value, shift: value } }]]);
        });

        it('handles the existing anchor', () => {
          const value = 0.5;
          const anchor = 0.1;
          const time = { ...props.viewRange.time, reframe: { anchor } };
          props = { ...props, viewRange: { time } };
          wrapper = shallow(<ViewingLayer {...props} />);
          wrapper.instance()._handleReframeDragUpdate({ value });
          const calls = props.updateNextViewRangeTime.mock.calls;
          expect(calls).toEqual([[{ reframe: { anchor, shift: value } }]]);
        });
      });

      describe('drag end', () => {
        let manager;

        beforeEach(() => {
          manager = { resetBounds: jest.fn() };
        });

        it('handles sans anchor', () => {
          const value = 0.5;
          wrapper.instance()._handleReframeDragEnd({ manager, value });
          expect(manager.resetBounds.mock.calls).toEqual([[]]);
          const calls = props.updateViewRangeTime.mock.calls;
          expect(calls).toEqual([[value, value, 'minimap']]);
        });

        it('handles dragged left (anchor is greater)', () => {
          const value = 0.5;
          const anchor = 0.6;
          const time = { ...props.viewRange.time, reframe: { anchor } };
          props = { ...props, viewRange: { time } };
          wrapper = shallow(<ViewingLayer {...props} />);
          wrapper.instance()._handleReframeDragEnd({ manager, value });

          expect(manager.resetBounds.mock.calls).toEqual([[]]);
          const calls = props.updateViewRangeTime.mock.calls;
          expect(calls).toEqual([[value, anchor, 'minimap']]);
        });

        it('handles dragged right (anchor is less)', () => {
          const value = 0.5;
          const anchor = 0.4;
          const time = { ...props.viewRange.time, reframe: { anchor } };
          props = { ...props, viewRange: { time } };
          wrapper = shallow(<ViewingLayer {...props} />);
          wrapper.instance()._handleReframeDragEnd({ manager, value });

          expect(manager.resetBounds.mock.calls).toEqual([[]]);
          const calls = props.updateViewRangeTime.mock.calls;
          expect(calls).toEqual([[anchor, value, 'minimap']]);
        });
      });
    });

    describe('scrubber', () => {
      it('prevents the cursor from being drawn on scrubber mouseover', () => {
        wrapper.instance()._handleScrubberEnterLeave({ type: EUpdateTypes.MouseEnter });
        expect(wrapper.state('preventCursorLine')).toBe(true);
      });

      it('prevents the cursor from being drawn on scrubber mouseleave', () => {
        wrapper.instance()._handleScrubberEnterLeave({ type: EUpdateTypes.MouseLeave });
        expect(wrapper.state('preventCursorLine')).toBe(false);
      });

      describe('drag start and update', () => {
        it('stops propagation on drag start', () => {
          const stopPropagation = jest.fn();
          const update = {
            event: { stopPropagation },
            type: EUpdateTypes.DragStart,
          };
          wrapper.instance()._handleScrubberDragUpdate(update);
          expect(stopPropagation.mock.calls).toEqual([[]]);
        });

        it('updates the viewRange for shiftStart and shiftEnd', () => {
          const instance = wrapper.instance();
          const value = 0.5;
          const cases = [
            {
              dragUpdate: {
                value,
                tag: dragTypes.SHIFT_START,
                type: EUpdateTypes.DragMove,
              },
              viewRangeUpdate: { shiftStart: value },
            },
            {
              dragUpdate: {
                value,
                tag: dragTypes.SHIFT_END,
                type: EUpdateTypes.DragMove,
              },
              viewRangeUpdate: { shiftEnd: value },
            },
          ];
          cases.forEach(_case => {
            instance._handleScrubberDragUpdate(_case.dragUpdate);
            expect(props.updateNextViewRangeTime).lastCalledWith(_case.viewRangeUpdate);
          });
        });
      });

      it('updates the view on drag end', () => {
        const instance = wrapper.instance();
        const [viewStart, viewEnd] = props.viewRange.time.current;
        const value = 0.5;
        const cases = [
          {
            dragUpdate: {
              value,
              manager: { resetBounds: jest.fn() },
              tag: dragTypes.SHIFT_START,
            },
            viewRangeUpdate: [value, viewEnd],
          },
          {
            dragUpdate: {
              value,
              manager: { resetBounds: jest.fn() },
              tag: dragTypes.SHIFT_END,
            },
            viewRangeUpdate: [viewStart, value],
          },
        ];
        cases.forEach(_case => {
          const { manager } = _case.dragUpdate;
          wrapper.setState({ preventCursorLine: true });
          expect(wrapper.state('preventCursorLine')).toBe(true);
          instance._handleScrubberDragEnd(_case.dragUpdate);
          expect(wrapper.state('preventCursorLine')).toBe(false);
          expect(manager.resetBounds.mock.calls).toEqual([[]]);
          expect(props.updateViewRangeTime).lastCalledWith(..._case.viewRangeUpdate, 'minimap');
        });
      });
    });
  });

  describe('Scroll bar and thumb behavior', () => {
    it('shows scroll bar when view range is not full', () => {
      wrapper.setProps({ viewRange: getViewRange(0.2, 0.8) });
      wrapper.setState({ showScrollBar: true });
      expect(wrapper.find('.ViewingLayer--scrollBar').prop('style').visibility).toBe('visible');
    });

    it('hides scroll bar when view range is full', () => {
      wrapper.setProps({ viewRange: getViewRange(0, 1) });
      wrapper.setState({ showScrollBar: true });
      const scrollBar = wrapper.find('.ViewingLayer--scrollBar');
      expect(scrollBar.prop('style').visibility).toBe('hidden');
    });

    it('updates scroll thumb position on view range change', () => {
      const instance = wrapper.instance();
      instance._scrollBar = { clientWidth: 200 };
      instance._scrollThumb = { style: {} };
      wrapper.setProps({ viewRange: getViewRange(0.2, 0.8) });
      instance._updateScrollThumb();
      expect(instance._scrollThumb.style.left).toBe('40px');
      expect(parseFloat(instance._scrollThumb.style.width)).toBeCloseTo(120, 0);
    });

    it('handles scroll event', () => {
      const mockEvent = {
        currentTarget: {
          scrollLeft: 20,
          scrollWidth: 200,
          clientWidth: 100,
        },
      };
      const instance = wrapper.instance();
      instance._scrollBar = mockEvent.currentTarget;
      instance._handleScroll(mockEvent);
      expect(props.updateViewRangeTime).toHaveBeenCalledWith(0.1, 0.6, 'scroll');
    });

    it('handles thumb mouse down event', () => {
      const instance = wrapper.instance();
      const mockEvent = { clientX: 100, preventDefault: jest.fn() };
      instance._onThumbMouseDown(mockEvent);
      expect(instance._isDraggingThumb).toBe(true);
      expect(instance._startX).toBe(100);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('handles thumb mouse move event', () => {
      const instance = wrapper.instance();
      instance._isDraggingThumb = true;
      instance._startX = 100;
      instance._startLeft = 50;
      instance._scrollBar = { clientWidth: 200 };
      instance._scrollThumb = { clientWidth: 100, style: {} };
      const mockEvent = { clientX: 120 };
      instance._onThumbMouseMove(mockEvent);
      expect(props.updateViewRangeTime).toHaveBeenCalledWith(0.35, 0.85, 'scroll');
    });

    it('handles thumb mouse up event', () => {
      const instance = wrapper.instance();
      instance._isDraggingThumb = true;
      instance._onThumbMouseUp();
      expect(instance._isDraggingThumb).toBe(false);
    });
  });

  it('renders inactive areas correctly', () => {
    wrapper.setProps({ viewRange: getViewRange(0.2, 0.8) });
    const inactiveAreas = wrapper.find('.ViewingLayer--inactive');
    expect(inactiveAreas).toHaveLength(2);
    expect(inactiveAreas.at(0).prop('x')).toBe('0');
    expect(parseFloat(inactiveAreas.at(0).prop('width'))).toBeCloseTo(20, 1);
    expect(inactiveAreas.at(1).prop('x')).toBe('80.000000%');
    expect(parseFloat(inactiveAreas.at(1).prop('width'))).toBeCloseTo(20, 1);
  });

  it('renders a <GraphTicks />', () => {
    expect(wrapper.find(GraphTicks).length).toBe(1);
  });

  it('renders handles for the timeRangeFilter', () => {
    const [viewStart, viewEnd] = props.viewRange.time.current;
    let scrubber = <Scrubber position={viewStart} />;
    expect(wrapper.containsMatchingElement(scrubber)).toBeTruthy();
    scrubber = <Scrubber position={viewEnd} />;
    expect(wrapper.containsMatchingElement(scrubber)).toBeTruthy();
  });

  describe('.ViewingLayer--resetZoom', () => {
    it('should not render if props.viewRange.time.current = [0,1]', () => {
      expect(wrapper.find('.ViewingLayer--resetZoom').length).toBe(0);
      wrapper.setProps({ viewRange: { time: { current: [0, 1] } } });
      expect(wrapper.find('.ViewingLayer--resetZoom').length).toBe(0);
    });

    it('should render if props.viewRange.time.current[0] !== 0', () => {
      wrapper.setProps({ viewRange: { time: { current: [0.1, 1] } } });
      wrapper.setState({ showScrollBar: true });
      expect(wrapper.find('.ViewingLayer--resetZoom').length).toBe(1);
    });

    it('should render if props.viewRange.time.current[1] !== 1', () => {
      wrapper.setProps({ viewRange: { time: { current: [0, 0.9] } } });
      wrapper.setState({ showScrollBar: true });
      expect(wrapper.find('.ViewingLayer--resetZoom').length).toBe(1);
    });

    it('should call props.updateViewRangeTime when clicked', () => {
      wrapper.setProps({ viewRange: { time: { current: [0.1, 0.9] } } });
      wrapper.setState({ showScrollBar: true });
      const resetZoomButton = wrapper.find('.ViewingLayer--resetZoom');
      resetZoomButton.simulate('click');
      expect(props.updateViewRangeTime).lastCalledWith(0, 1);
    });
  });
});
