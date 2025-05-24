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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import TimelineViewingLayer from './TimelineViewingLayer';

function mapFromSubRange(viewStart, viewEnd, value) {
  return viewStart + value * (viewEnd - viewStart);
}

describe('<TimelineViewingLayer>', () => {
  let rendered;
  beforeEach(() => {
    rendered = render(<TimelineViewingLayer {...props} / data-testid="timelineviewinglayer">);
    instance = // RTL doesn't access component instances - use assertions on rendered output instead;
  });

  it('renders without exploding', () => {
    expect(wrapper).toBeDefined();
    expect(screen.getAllByTestId('.TimelineViewingLayer')).toHaveLength(1);
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
      rendered = render({ viewRangeTime });
      expect(container.getAttribute('viewRangeTime').reframe.anchor).toBe(anchor);
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
      rendered = render({ viewRangeTime });
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
      rendered = render({ viewRangeTime });
      instance._draggerReframe._onDragEnd({ manager, value });
      expect(props.updateViewRangeTime.mock.calls).toEqual([[shift, anchor, 'timeline-header']]);
    });

    it('resets draggable bounds on boundsInvalidator update', () => {
      const spy = jest.spyOn(instance._draggerReframe, 'resetBounds');
      rendered = render({ boundsInvalidator: 'SOMETHING-NEW' });
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('render()', () => {
    it('renders nothing without a nextViewRangeTime', () => {
      expect(screen.getAllByTestId('div')).toHaveLength(1);
    });

    it('renders the cursor when it is the only non-current value set', () => {
      const cursor = viewStart + 0.5 * (viewEnd - viewStart);
      const baseViewRangeTime = { ...props.viewRangeTime, cursor };
      rendered = render({ viewRangeTime: baseViewRangeTime });
      // cursor is rendered when solo
      expect(screen.getAllByTestId('.TimelineViewingLayer--cursorGuide')).toHaveLength(1);
      // cursor is skipped when shiftStart, shiftEnd, or reframe are present
      let viewRangeTime = { ...baseViewRangeTime, shiftStart: cursor };
      rendered = render({ viewRangeTime });
      expect(screen.getAllByTestId('.TimelineViewingLayer--cursorGuide')).toHaveLength(0);
      viewRangeTime = { ...baseViewRangeTime, shiftEnd: cursor };
      rendered = render({ viewRangeTime });
      expect(screen.getAllByTestId('.TimelineViewingLayer--cursorGuide')).toHaveLength(0);
      viewRangeTime = { ...baseViewRangeTime, reframe: { anchor: cursor, shift: cursor } };
      rendered = render({ viewRangeTime });
      expect(screen.getAllByTestId('.TimelineViewingLayer--cursorGuide')).toHaveLength(0);
    });

    it('renders the reframe dragging', () => {
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor: viewStart, shift: viewEnd } };
      rendered = render({ viewRangeTime });
      expect(screen.getAllByTestId('.isDraggingRight.isReframeDrag')).toHaveLength(1);
    });

    it('renders the reframe dragging normalized left', () => {
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor: -0.25, shift: viewEnd } };
      rendered = render({ viewRangeTime });
      expect(screen.getAllByTestId('.isDraggingRight.isReframeDrag')).toHaveLength(1);
    });

    it('renders the reframe dragging normalized right', () => {
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor: viewStart, shift: 1.25 } };
      rendered = render({ viewRangeTime });
      expect(screen.getAllByTestId('.isDraggingRight.isReframeDrag')).toHaveLength(1);
    });

    it('does not render the reframe on out of bounds', () => {
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor: 1.5, shift: 1.75 } };
      rendered = render({ viewRangeTime });
      expect(screen.getAllByTestId('.isReframeDrag')).toHaveLength(0);
    });

    it('renders the shiftStart dragging', () => {
      const viewRangeTime = { ...props.viewRangeTime, shiftStart: viewEnd };
      rendered = render({ viewRangeTime });
      expect(screen.getAllByTestId('.isDraggingRight.isShiftDrag')).toHaveLength(1);
    });

    it('renders the shiftEnd dragging', () => {
      const viewRangeTime = { ...props.viewRangeTime, shiftEnd: viewStart };
      rendered = render({ viewRangeTime });
      expect(screen.getAllByTestId('.isDraggingLeft.isShiftDrag')).toHaveLength(1);
    });
  });
});
