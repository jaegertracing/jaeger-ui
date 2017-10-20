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
import { mount } from 'enzyme';

import TimelineColumnResizer from './TimelineColumnResizer';

describe('<TimelineColumnResizer>', () => {
  let wrapper;
  let instance;

  const props = {
    min: 0.1,
    max: 0.9,
    onChange: jest.fn(),
    position: 0.5,
  };

  beforeEach(() => {
    props.onChange.mockReset();
    wrapper = mount(<TimelineColumnResizer {...props} />);
    instance = wrapper.instance();
  });

  it('renders without exploding', () => {
    expect(wrapper).toBeDefined();
    expect(wrapper.find('.TimelineColumnResizer').length).toBe(1);
    expect(wrapper.find('.TimelineColumnResizer--wrapper').length).toBe(1);
    expect(wrapper.find('.TimelineColumnResizer--gripIcon').length).toBe(1);
    expect(wrapper.find('.TimelineColumnResizer--dragger').length).toBe(1);
  });

  it('sets the root elm', () => {
    const rootWrapper = wrapper.find('.TimelineColumnResizer');
    expect(rootWrapper.getDOMNode()).toBe(instance._rootElm);
  });

  describe('uses DraggableManager', () => {
    it('handles mouse down on the dragger', () => {
      const dragger = wrapper.find({ onMouseDown: instance._dragManager.handleMouseDown });
      expect(dragger.length).toBe(1);
      expect(dragger.is('.TimelineColumnResizer--dragger')).toBe(true);
    });

    it('returns the draggable bounds via _getDraggingBounds()', () => {
      const left = 10;
      const width = 100;
      instance._rootElm.getBoundingClientRect = () => ({ left, width });
      expect(instance._getDraggingBounds()).toEqual({
        width,
        clientXLeft: left,
        maxValue: props.max,
        minValue: props.min,
      });
    });

    it('handles drag start', () => {
      const value = Math.random();
      expect(wrapper.state('dragPosition')).toBe(null);
      instance._handleDragUpdate({ value });
      expect(wrapper.state('dragPosition')).toBe(value);
    });

    it('handles drag end', () => {
      const manager = { resetBounds: jest.fn() };
      const value = Math.random();
      wrapper.setState({ dragPosition: 2 * value });
      instance._handleDragEnd({ manager, value });
      expect(manager.resetBounds.mock.calls).toEqual([[]]);
      expect(wrapper.state('dragPosition')).toBe(null);
      expect(props.onChange.mock.calls).toEqual([[value]]);
    });
  });

  it('does not render a dragging indicator when not dragging', () => {
    expect(wrapper.find('.isDraggingLeft').length + wrapper.find('.isDraggingRight').length).toBe(0);
    expect(wrapper.find('.TimelineColumnResizer--dragger').prop('style').right).toBe(undefined);
  });

  it('renders a dragging indicator when dragging', () => {
    instance._dragManager.isDragging = () => true;
    instance._handleDragUpdate({ value: props.min });
    instance.forceUpdate();
    expect(wrapper.find('.isDraggingLeft').length + wrapper.find('.isDraggingRight').length).toBe(1);
    expect(wrapper.find('.TimelineColumnResizer--dragger').prop('style').right).toBeDefined();
  });
});
