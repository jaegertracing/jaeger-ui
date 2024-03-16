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
import { mount } from 'enzyme';

import TimelineViewingLayer from './TimelineViewingLayer';

function mapFromSubRange(viewStart, viewEnd, value) {
  return viewStart + value * (viewEnd - viewStart);
}

describe('<TimelineViewingLayer>', () => {
  let wrapper;
  let instance;

  const viewStart = 0.25;
  const viewEnd = 0.9;
  const props = {
    boundsInvalidator: Math.random(),
    updateNextViewRangeTime: jest.fn(),
    updateViewRangeTime: jest.fn(),
    viewRangeTime: {
      current: [viewStart, viewEnd],
    },
  };

  beforeEach(() => {
    props.updateNextViewRangeTime.mockReset();
    props.updateViewRangeTime.mockReset();
    wrapper = mount(<TimelineViewingLayer {...props} />);
    instance = wrapper.instance();
  });

  it('renders without exploding', () => {
    expect(wrapper).toBeDefined();
    expect(wrapper.find('.TimelineViewingLayer').length).toBe(1);
  });

  it('sets _root to the root DOM node', () => {
    expect(instance._root).toBeDefined();
    expect(wrapper.find('.TimelineViewingLayer').getDOMNode()).toBe(instance._root.current);
  });

  describe('uses DraggableManager', () => {
    it('initializes the DraggableManager', () => {
      const dm = instance._draggerReframe;
      expect(dm).toBeDefined();
      expect(dm._onMouseMove).toBe(instance._handleReframeMouseMove);
      expect(dm._onMouseLeave).toBe(instance._handleReframeMouseLeave);
      expect(dm._onDragStart).toBe(instance._handleReframeDragUpdate);
      expect(dm._onDragMove).toBe(instance._handleReframeDragUpdate);
      expect(dm._onDragEnd).toBe(instance._handleReframeDragEnd);
    });

    it('provides the DraggableManager handlers as callbacks', () => {
      const { handleMouseDown, handleMouseLeave, handleMouseMove } = instance._draggerReframe;
      const rootWrapper = wrapper.find('.TimelineViewingLayer');
      expect(rootWrapper.prop('onMouseDown')).toBe(handleMouseDown);
      expect(rootWrapper.prop('onMouseLeave')).toBe(handleMouseLeave);
      expect(rootWrapper.prop('onMouseMove')).toBe(handleMouseMove);
    });

    it('returns the dragging bounds from _getDraggingBounds()', () => {
      const left = 10;
      const width = 100;
      instance._root.current.getBoundingClientRect = () => ({ left, width });
      expect(instance._getDraggingBounds()).toEqual({ width, clientXLeft: left });
    });

    it('throws error on call to _getDraggingBounds() on unmounted component', () => {
      wrapper.unmount();
      expect(instance._getDraggingBounds).toThrow(
        'Component must be mounted in order to determine DraggableBounds'
      );
    });

    it('updates viewRange.time.cursor via _draggerReframe._onMouseMove', () => {
      const value = 0.5;
      const cursor = mapFromSubRange(viewStart, viewEnd, value);
      instance._draggerReframe._onMouseMove({ value });
      expect(props.updateNextViewRangeTime.mock.calls).toEqual([[{ cursor }]]);
    });

    it('resets viewRange.time.cursor via _draggerReframe._onMouseLeave', () => {
      instance._draggerReframe._onMouseLeave();
      expect(props.updateNextViewRangeTime.mock.calls).toEqual([[{ cursor: undefined }]]);
    });

    it('handles drag start via _draggerReframe._onDragStart', () => {
      const value = 0.5;
      const shift = mapFromSubRange(viewStart, viewEnd, value);
      const update = { reframe: { shift, anchor: shift } };
      instance._draggerReframe._onDragStart({ value });
      expect(props.updateNextViewRangeTime.mock.calls).toEqual([[update]]);
    });

    it('handles drag move via _draggerReframe._onDragMove', () => {
      const anchor = 0.25;
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor, shift: 0.5 } };
      const value = 0.5;
      const shift = mapFromSubRange(viewStart, viewEnd, value);
      // make sure `anchor` is already present on the props
      wrapper.setProps({ viewRangeTime });
      expect(wrapper.prop('viewRangeTime').reframe.anchor).toBe(anchor);
      // the next update should integrate `value` and use the existing anchor
      instance._draggerReframe._onDragStart({ value });
      const update = { reframe: { anchor, shift } };
      expect(props.updateNextViewRangeTime.mock.calls).toEqual([[update]]);
    });

    it('handles drag end via _draggerReframe._onDragEnd', () => {
      const manager = { resetBounds: jest.fn() };
      const value = 0.5;
      const shift = mapFromSubRange(viewStart, viewEnd, value);
      const anchor = 0.25;
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor, shift } };
      wrapper.setProps({ viewRangeTime });
      instance._draggerReframe._onDragEnd({ manager, value });
      expect(manager.resetBounds.mock.calls).toEqual([[]]);
      expect(props.updateViewRangeTime.mock.calls).toEqual([[anchor, shift, 'timeline-header']]);
    });

    it('_draggerReframe._onDragEnd sorts anchor and shift', () => {
      const manager = { resetBounds: jest.fn() };
      const value = 0.5;
      const shift = mapFromSubRange(viewStart, viewEnd, value);
      const anchor = 0.75;
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor, shift } };
      wrapper.setProps({ viewRangeTime });
      instance._draggerReframe._onDragEnd({ manager, value });
      expect(props.updateViewRangeTime.mock.calls).toEqual([[shift, anchor, 'timeline-header']]);
    });

    it('resets draggable bounds on boundsInvalidator update', () => {
      const spy = jest.spyOn(instance._draggerReframe, 'resetBounds');
      wrapper.setProps({ boundsInvalidator: 'SOMETHING-NEW' });
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('render()', () => {
    it('renders nothing without a nextViewRangeTime', () => {
      expect(wrapper.find('div').length).toBe(1);
    });

    it('renders the cursor when it is the only non-current value set', () => {
      const cursor = viewStart + 0.5 * (viewEnd - viewStart);
      const baseViewRangeTime = { ...props.viewRangeTime, cursor };
      wrapper.setProps({ viewRangeTime: baseViewRangeTime });
      // cursor is rendered when solo
      expect(wrapper.find('.TimelineViewingLayer--cursorGuide').length).toBe(1);
      // cursor is skipped when shiftStart, shiftEnd, or reframe are present
      let viewRangeTime = { ...baseViewRangeTime, shiftStart: cursor };
      wrapper.setProps({ viewRangeTime });
      expect(wrapper.find('.TimelineViewingLayer--cursorGuide').length).toBe(0);
      viewRangeTime = { ...baseViewRangeTime, shiftEnd: cursor };
      wrapper.setProps({ viewRangeTime });
      expect(wrapper.find('.TimelineViewingLayer--cursorGuide').length).toBe(0);
      viewRangeTime = { ...baseViewRangeTime, reframe: { anchor: cursor, shift: cursor } };
      wrapper.setProps({ viewRangeTime });
      expect(wrapper.find('.TimelineViewingLayer--cursorGuide').length).toBe(0);
    });

    it('renders the reframe dragging', () => {
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor: viewStart, shift: viewEnd } };
      wrapper.setProps({ viewRangeTime });
      expect(wrapper.find('.isDraggingRight.isReframeDrag').length).toBe(1);
    });

    it('renders the reframe dragging normalized left', () => {
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor: -0.25, shift: viewEnd } };
      wrapper.setProps({ viewRangeTime });
      expect(wrapper.find('.isDraggingRight.isReframeDrag').length).toBe(1);
    });

    it('renders the reframe dragging normalized right', () => {
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor: viewStart, shift: 1.25 } };
      wrapper.setProps({ viewRangeTime });
      expect(wrapper.find('.isDraggingRight.isReframeDrag').length).toBe(1);
    });

    it('does not render the reframe on out of bounds', () => {
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor: 1.5, shift: 1.75 } };
      wrapper.setProps({ viewRangeTime });
      expect(wrapper.find('.isReframeDrag').length).toBe(0);
    });

    it('renders the shiftStart dragging', () => {
      const viewRangeTime = { ...props.viewRangeTime, shiftStart: viewEnd };
      wrapper.setProps({ viewRangeTime });
      expect(wrapper.find('.isDraggingRight.isShiftDrag').length).toBe(1);
    });

    it('renders the shiftEnd dragging', () => {
      const viewRangeTime = { ...props.viewRangeTime, shiftEnd: viewStart };
      wrapper.setProps({ viewRangeTime });
      expect(wrapper.find('.isDraggingLeft.isShiftDrag').length).toBe(1);
    });
  });
});
