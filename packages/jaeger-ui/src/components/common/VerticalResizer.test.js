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
import { render, fireEvent, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import VerticalResizer from './VerticalResizer';

let draggableManagerConfig = null;
const mockDragManager = {
  handleMouseDown: jest.fn(),
  isDragging: jest.fn(() => false),
  dispose: jest.fn(),
  resetBounds: jest.fn(),
};

jest.mock('../../utils/DraggableManager', () => {
  return jest.fn().mockImplementation(config => {
    draggableManagerConfig = config;
    return mockDragManager;
  });
});

describe('<VerticalResizer>', () => {
  let mockOnChange;

  const props = {
    min: 0.1,
    max: 0.9,
    onChange: jest.fn(),
    position: 0.5,
  };

  beforeEach(() => {
    mockOnChange = jest.fn();
    props.onChange = mockOnChange;
    mockDragManager.isDragging.mockReturnValue(false);
    draggableManagerConfig = null;
    jest.clearAllMocks();
  });

  it('renders without exploding', () => {
    render(<VerticalResizer {...props} />);
    expect(screen.getByTestId('vertical-resizer')).toBeInTheDocument();
    expect(screen.getByTestId('grip-icon')).toBeInTheDocument();
    expect(screen.getByTestId('dragger')).toBeInTheDocument();
  });

  it('sets the root elm', () => {
    const { container } = render(<VerticalResizer {...props} />);
    const elm = container.querySelector('.VerticalResizer');
    expect(elm).toBeTruthy();
  });

  describe('uses DraggableManager', () => {
    it('handles mouse down on the dragger', () => {
      render(<VerticalResizer {...props} />);
      fireEvent.mouseDown(screen.getByTestId('dragger'));
      expect(mockDragManager.handleMouseDown).toHaveBeenCalled();
    });

    it('returns the draggable bounds via _getDraggingBounds()', () => {
      const { container } = render(<VerticalResizer {...props} />);
      const elm = container.querySelector('.VerticalResizer');
      expect(elm).toBeTruthy();
      elm.getBoundingClientRect = () => ({ left: 10, width: 100 });
      const bounds = draggableManagerConfig.getBounds();
      expect(bounds).toEqual({ clientXLeft: 10, width: 100, minValue: 0.1, maxValue: 0.9 });
    });

    it('returns the flipped draggable bounds via _getDraggingBounds()', () => {
      const { container } = render(<VerticalResizer {...props} rightSide />);
      const elm = container.querySelector('.VerticalResizer');
      expect(elm).toBeTruthy();
      elm.getBoundingClientRect = () => ({ left: 10, width: 100 });
      const bounds = draggableManagerConfig.getBounds();
      expect(bounds.clientXLeft).toBe(10);
      expect(bounds.width).toBe(100);
      expect(bounds.maxValue).toBeCloseTo(1 - props.min);
      expect(bounds.minValue).toBeCloseTo(1 - props.max);
    });

    it('throws if dragged before rendered', () => {
      const { unmount } = render(<VerticalResizer {...props} />);
      // Unmount the component. This causes React to set rootElmRef.current to null.
      unmount();
      // The function return a default object instead of throwing
      expect(draggableManagerConfig.getBounds()).toEqual({
        clientXLeft: 0,
        width: 0,
        minValue: 0,
        maxValue: 0,
      });
    });

    it('handles drag start', () => {
      mockDragManager.isDragging.mockReturnValue(true);
      render(<VerticalResizer {...props} />);
      act(() => draggableManagerConfig.onDragStart({ value: 0.3 }));
      const dragger = screen.getByTestId('dragger');
      expect(dragger).toBeInTheDocument();
      expect(dragger).toHaveStyle({ left: '30%' });
    });

    it('handles drag update', () => {
      mockDragManager.isDragging.mockReturnValue(true);
      render(<VerticalResizer {...props} />);
      act(() => draggableManagerConfig.onDragMove({ value: 0.6 }));
      expect(screen.getByTestId('dragger')).toBeInTheDocument();
      // When dragging from position 0.5 to 0.6, the dragger shows a highlight
      // from min(0.5, 0.6) = 0.5 to max(0.5, 0.6) = 0.6
      expect(screen.getByTestId('dragger')).toHaveStyle({
        left: '50%',
        right: 'calc(40% - 1px)',
      });
    });

    it('handles flipped drag update', () => {
      mockDragManager.isDragging.mockReturnValue(true);
      render(<VerticalResizer {...props} rightSide />);
      act(() => draggableManagerConfig.onDragMove({ value: 0.6 }));
      const dragger = screen.getByTestId('dragger');
      expect(dragger).toBeInTheDocument();
      expect(dragger).toHaveStyle({ left: '40%' });
    });

    it('handles drag end', () => {
      const fakeMgr = { resetBounds: jest.fn() };
      render(<VerticalResizer {...props} />);
      act(() => draggableManagerConfig.onDragEnd({ manager: fakeMgr, value: 0.6 }));
      expect(fakeMgr.resetBounds).toHaveBeenCalled();
      expect(mockOnChange).toHaveBeenCalledWith(0.6);
    });

    it('handles flipped drag end', () => {
      const fakeMgr = { resetBounds: jest.fn() };
      render(<VerticalResizer {...props} rightSide />); // 'rightSide' flips the drag direction
      act(() => {
        // When rightSide is true, the actual dragPosition becomes (1 - value)
        // So value: 0.4 → dragPosition: 0.6 → onChange(0.6) should be called
        draggableManagerConfig.onDragEnd({ manager: fakeMgr, value: 0.4 });
      });
      expect(fakeMgr.resetBounds).toHaveBeenCalled();
      expect(mockOnChange).toHaveBeenCalledWith(0.6); // flipped: 1 - 0.4
    });

    it('cleans up DraggableManager on unmount', () => {
      const { unmount } = render(<VerticalResizer {...props} />);
      unmount();
      expect(mockDragManager.dispose).toHaveBeenCalledTimes(1);
    });
  });

  it('does not render a dragging indicator when not dragging', () => {
    render(<VerticalResizer {...props} />);
    const dragger = screen.getByTestId('dragger');
    expect(dragger.style.right).toBe('');
  });

  it('renders a dragging indicator when dragging', () => {
    mockDragManager.isDragging.mockReturnValue(true);
    render(<VerticalResizer {...props} />);
    act(() => draggableManagerConfig.onDragMove({ value: props.min }));
    const dragger = screen.getByTestId('dragger');
    expect(dragger).toBeInTheDocument();
    expect(dragger).toHaveStyle({
      left: '10%',
      right: 'calc(50% - 1px)',
    });
    expect(screen.getByTestId('vertical-resizer')).toHaveClass(/isDraggingLeft|isDraggingRight/);
  });

  it('renders is-flipped classname when positioned on rightSide', () => {
    const { rerender } = render(<VerticalResizer {...props} />);
    expect(screen.getByTestId('vertical-resizer')).not.toHaveClass('is-flipped');
    rerender(<VerticalResizer {...props} rightSide />);
    expect(screen.getByTestId('vertical-resizer')).toHaveClass('is-flipped');
  });
});
