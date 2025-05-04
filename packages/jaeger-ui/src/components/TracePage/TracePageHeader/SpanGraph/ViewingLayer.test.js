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

import React from 'react';
import { shallow } from 'enzyme';
import ViewingLayer from './ViewingLayer';
import { EUpdateTypes, dragTypes } from '../../../../utils/DraggableManager';

function getViewRange(viewStart, viewEnd) {
  return {
    time: {
      current: [viewStart, viewEnd],
      reframe: null,
      shiftStart: null,
      shiftEnd: null,
      cursor: null,
    },
  };
}

describe('<ViewingLayer>', () => {
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

  describe('render', () => {
    it('renders without exploding', () => {
      expect(wrapper.exists()).toBe(true);
    });

    it('renders GraphTicks', () => {
      expect(wrapper.find('GraphTicks').exists()).toBe(true);
    });

    it('renders two Scrubbers', () => {
      expect(wrapper.find('Scrubber')).toHaveLength(2);
    });
  });

  describe('reset zoom button', () => {
    it('renders reset zoom button when fully zoomed out', () => {
      wrapper.setProps({ viewRange: getViewRange(0, 1) });
      wrapper.update();
      expect(wrapper.find('.ViewingLayer--resetZoom').exists()).toBe(false);
    });

    it('renders reset zoom button with correct text when zoomed in', () => {
      wrapper.setProps({ viewRange: getViewRange(0.1, 0.9) });
      wrapper.update();
      const resetButton = wrapper.find('.ViewingLayer--resetZoom');
      expect(resetButton.exists()).toBe(true);
      expect(resetButton.text()).toBe('Reset Selection');
    });
  });

  describe('mouse events', () => {
    it('updates state on mouse move', () => {
      const mockEvent = {
        clientX: 300,
        currentTarget: {
          getBoundingClientRect: () => ({ left: 100, width: 1000, top: 0 }),
        },
      };
      wrapper.instance()._handleMouseMove(mockEvent);
      expect(wrapper.state('hoverPosition')).toBeCloseTo(0.2, 2);
    });

    it('calls _debouncedMouseMove on mouse move', () => {
      const instance = wrapper.instance();
      instance._debouncedMouseMove = jest.fn();
      const mockEvent = {
        clientX: 600,
        currentTarget: {
          getBoundingClientRect: () => ({ left: 100, width: 1000, top: 0 }),
        },
      };
      instance._handleMouseMove(mockEvent);
      expect(instance._debouncedMouseMove).toHaveBeenCalled();
    });

    it('handles mouse down event', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
        clientX: 300,
        currentTarget: {
          getBoundingClientRect: () => ({ left: 100, width: 1000, top: 0, height: 60 }),
        },
      };
      wrapper.find('.ViewingLayer--graph').simulate('mouseDown', mockEvent);
      expect(wrapper.state('isCreatingAnchors')).toBe(true);
    });

    it('handles mouse up event', () => {
      wrapper.setState({ isPanning: true, isCreatingAnchors: true });
      wrapper.instance()._handleWindowMouseUp();
      expect(wrapper.state('isPanning')).toBe(false);
      expect(wrapper.state('isCreatingAnchors')).toBe(false);
    });
  });

  describe('Cursor synchronization', () => {
    it('clears cursor on mouse leave', () => {
      wrapper.instance()._handleMouseLeave();
      expect(props.updateNextViewRangeTime).toHaveBeenCalledWith({ cursor: null });
    });
  });

  describe('ViewingLayer methods', () => {
    it('_resetTimeZoomClickHandler calls updateViewRangeTime', () => {
      wrapper.instance()._resetTimeZoomClickHandler();
      expect(props.updateViewRangeTime).toHaveBeenCalledWith(0, 1);
    });

    it('_handleReframeDragUpdate updates next view range time', () => {
      wrapper.instance()._handleReframeDragUpdate({ value: 0.5 });
      expect(props.updateNextViewRangeTime).toHaveBeenCalledWith({
        reframe: { anchor: 0.5, shift: 0.5 },
      });
    });

    it('_handleReframeDragEnd updates view range time', () => {
      const mockManager = { resetBounds: jest.fn() };
      wrapper.instance()._handleReframeDragEnd({ manager: mockManager, value: 0.5 });
      expect(mockManager.resetBounds).toHaveBeenCalled();
      expect(props.updateViewRangeTime).toHaveBeenCalledWith(0.5, 0.5, 'minimap');
    });

    it('_handleScrubberEnterLeave updates state', () => {
      wrapper.instance()._handleScrubberEnterLeave({ type: EUpdateTypes.MouseEnter });
      expect(wrapper.state('preventCursorLine')).toBe(true);

      wrapper.instance()._handleScrubberEnterLeave({ type: EUpdateTypes.MouseLeave });
      expect(wrapper.state('preventCursorLine')).toBe(false);
    });

    it('_handleScrubberDragUpdate updates next view range time', () => {
      wrapper.instance()._handleScrubberDragUpdate({ value: 0.5, tag: 'SHIFT_START' });
      expect(props.updateNextViewRangeTime).toHaveBeenCalledWith({ shiftStart: 0.5 });

      wrapper.instance()._handleScrubberDragUpdate({ value: 0.7, tag: 'SHIFT_END' });
      expect(props.updateNextViewRangeTime).toHaveBeenCalledWith({ shiftEnd: 0.7 });
    });

    it('_handleScrubberDragEnd updates view range time', () => {
      const mockManager = { resetBounds: jest.fn() };
      wrapper.instance()._handleScrubberDragEnd({ manager: mockManager, value: 0.5, tag: 'SHIFT_START' });
      expect(mockManager.resetBounds).toHaveBeenCalled();
      expect(props.updateViewRangeTime).toHaveBeenCalledWith(0.5, 1, 'minimap');

      wrapper.instance()._handleScrubberDragEnd({ manager: mockManager, value: 0.7, tag: 'SHIFT_END' });
      expect(props.updateViewRangeTime).toHaveBeenCalledWith(0, 0.7, 'minimap');
    });
  });

  describe('Boundary conditions', () => {
    it('handles mouse down at leftmost edge', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
        clientX: 100, // Assume this is the left edge
        currentTarget: {
          getBoundingClientRect: () => ({ left: 100, width: 1000, top: 0, height: 60 }),
        },
      };
      wrapper.find('.ViewingLayer--graph').simulate('mouseDown', mockEvent);
      expect(wrapper.state('anchorStartX')).toBe(0);
    });

    it('handles mouse down at rightmost edge', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
        clientX: 1100, // Assume this is the right edge
        currentTarget: {
          getBoundingClientRect: () => ({ left: 100, width: 1000, top: 0, height: 60 }),
        },
      };
      wrapper.find('.ViewingLayer--graph').simulate('mouseDown', mockEvent);
      expect(wrapper.state('anchorStartX')).toBe(1);
    });
  });
});
