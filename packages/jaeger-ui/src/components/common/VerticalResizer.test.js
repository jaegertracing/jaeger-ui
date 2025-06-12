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

describe('VerticalResizer', () => {
  let mockOnChange;

  const defaultProps = {
    min: 0.1,
    max: 0.9,
    onChange: jest.fn(),
    position: 0.5,
  };

  beforeEach(() => {
    mockOnChange = jest.fn();
    defaultProps.onChange = mockOnChange;
    mockDragManager.isDragging.mockReturnValue(false);
    draggableManagerConfig = null;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the vertical resizer with all required elements', () => {
      render(<VerticalResizer {...defaultProps} />);
      expect(screen.getByTestId('vertical-resizer')).toBeInTheDocument();
      expect(screen.getByTestId('grip-icon')).toBeInTheDocument();
      expect(screen.getByTestId('dragger')).toBeInTheDocument();
    });

    it('applies correct CSS classes for basic rendering', () => {
      render(<VerticalResizer {...defaultProps} />);
      const resizer = screen.getByTestId('vertical-resizer');
      expect(resizer).toHaveClass('VerticalResizer');
      expect(resizer).not.toHaveClass('is-flipped');
    });

    it('applies is-flipped class when rightSide prop is true', () => {
      render(<VerticalResizer {...defaultProps} rightSide />);
      const resizer = screen.getByTestId('vertical-resizer');
      expect(resizer).toHaveClass('VerticalResizer', 'is-flipped');
    });

    it('positions grip icon correctly based on position prop', () => {
      render(<VerticalResizer {...defaultProps} position={0.3} />);
      expect(screen.getByTestId('grip-icon')).toHaveStyle({ left: '30%' });
    });

    it('positions dragger element correctly when not dragging', () => {
      render(<VerticalResizer {...defaultProps} position={0.7} />);
      expect(screen.getByTestId('dragger')).toHaveStyle({ left: '70%' });
    });
  });

  describe('DraggableManager Integration', () => {
    it('initializes DraggableManager with correct configuration', () => {
      render(<VerticalResizer {...defaultProps} />);
      expect(draggableManagerConfig).toEqual(
        expect.objectContaining({
          getBounds: expect.any(Function),
          onDragEnd: expect.any(Function),
          onDragMove: expect.any(Function),
          onDragStart: expect.any(Function),
        })
      );
    });

    it('attaches mouse down handler to dragger element', () => {
      render(<VerticalResizer {...defaultProps} />);
      fireEvent.mouseDown(screen.getByTestId('dragger'));
      expect(mockDragManager.handleMouseDown).toHaveBeenCalled();
    });

    it('disposes DraggableManager on component unmount', () => {
      const { unmount } = render(<VerticalResizer {...defaultProps} />);
      mockDragManager.dispose.mockClear();
      unmount();
      expect(mockDragManager.dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dragging Bounds Calculation', () => {
    it('calculates bounds correctly for left-side resizer', () => {
      const { container } = render(<VerticalResizer {...defaultProps} />);
      const elem = container.querySelector('.VerticalResizer');
      elem.getBoundingClientRect = () => ({ left: 10, width: 100 });

      const bounds = draggableManagerConfig.getBounds();
      expect(bounds.clientXLeft).toBe(10);
      expect(bounds.width).toBe(100);
      expect(bounds.maxValue).toBeCloseTo(0.9);
      expect(bounds.minValue).toBeCloseTo(0.1);
    });

    it('calculates flipped bounds correctly for right-side resizer', () => {
      const { container } = render(<VerticalResizer {...defaultProps} rightSide />);
      const elem = container.querySelector('.VerticalResizer');
      elem.getBoundingClientRect = () => ({ left: 20, width: 200 });

      const bounds = draggableManagerConfig.getBounds();
      expect(bounds.clientXLeft).toBe(20);
      expect(bounds.width).toBe(200);
      expect(bounds.maxValue).toBeCloseTo(0.9);
      expect(bounds.minValue).toBeCloseTo(0.1);
    });

    it('throws error when _rootElm is not set', async () => {
      let instance = null;

      render(
        <VerticalResizer
          {...defaultProps}
          ref={ref => {
            if (ref) instance = ref;
          }}
        />
      );

      await act(async () => {
        instance._rootElm = undefined;
      });

      expect(() => {
        draggableManagerConfig.getBounds();
      }).toThrow('invalid state');
    });
  });

  describe('Drag Event Handling', () => {
    it('calls onChange with unflipped value on drag end', () => {
      render(<VerticalResizer {...defaultProps} />);
      const fakeMgr = { resetBounds: jest.fn() };
      act(() => {
        draggableManagerConfig.onDragEnd({ manager: fakeMgr, value: 0.6 });
      });
      expect(fakeMgr.resetBounds).toHaveBeenCalled();
      expect(mockOnChange).toHaveBeenCalledWith(0.6);
    });

    it('calls onChange with flipped value when rightSide', () => {
      render(<VerticalResizer {...defaultProps} rightSide />);
      const fakeMgr = { resetBounds: jest.fn() };
      act(() => {
        draggableManagerConfig.onDragEnd({ manager: fakeMgr, value: 0.4 });
      });
      expect(fakeMgr.resetBounds).toHaveBeenCalled();
      expect(mockOnChange).toHaveBeenCalledWith(1 - 0.4);
    });
  });

  describe('Dragging Visual States', () => {
    it('does not show indicators when not dragging', () => {
      const { container } = render(<VerticalResizer {...defaultProps} />);
      expect(container.querySelector('.isDraggingLeft')).not.toBeInTheDocument();
      expect(container.querySelector('.isDraggingRight')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('renders zero position correctly', () => {
      render(<VerticalResizer {...defaultProps} position={0} />);
      expect(screen.getByTestId('grip-icon')).toHaveStyle({ left: '0%' });
    });

    it('renders max position (1.0) correctly', () => {
      render(<VerticalResizer {...defaultProps} position={1.0} />);
      expect(screen.getByTestId('grip-icon')).toHaveStyle({ left: '100%' });
    });
  });

  describe('Accessibility', () => {
    it('marks dragger as aria-hidden', () => {
      render(<VerticalResizer {...defaultProps} />);
      expect(screen.getByTestId('dragger')).toHaveAttribute('aria-hidden');
    });
  });

  describe('Component Lifecycle', () => {
    it('updates grip-icon when position prop changes', () => {
      const { rerender } = render(<VerticalResizer {...defaultProps} position={0.3} />);
      expect(screen.getByTestId('grip-icon')).toHaveStyle({ left: '30%' });
      rerender(<VerticalResizer {...defaultProps} position={0.7} />);
      expect(screen.getByTestId('grip-icon')).toHaveStyle({ left: '70%' });
    });
  });

  describe('Full Dragging Visuals', () => {
    beforeEach(() => {
      mockDragManager.isDragging.mockReturnValue(true);
      render(<VerticalResizer {...defaultProps} />);
    });

    it('applies isDraggingLeft and correct styles when dragging left', () => {
      act(() => {
        draggableManagerConfig.onDragStart({ value: 0.3 });
      });

      const root = screen.getByTestId('vertical-resizer');
      const grip = screen.getByTestId('grip-icon');
      const dragger = screen.getByTestId('dragger');

      expect(root).toHaveClass('isDraggingLeft');
      expect(grip).toHaveStyle({ left: '50%' });
      expect(dragger).toHaveStyle({ left: '30%' });
      expect(dragger.getAttribute('style')).toMatch(/calc\(50% - 1px\)/);
    });

    it('applies isDraggingRight and correct styles when dragging right', () => {
      act(() => {
        draggableManagerConfig.onDragMove({ value: 0.8 });
      });

      const root = screen.getByTestId('vertical-resizer');
      const grip = screen.getByTestId('grip-icon');
      const dragger = screen.getByTestId('dragger');

      expect(root).toHaveClass('isDraggingRight');
      expect(grip).toHaveStyle({ left: '50%' });
      expect(dragger).toHaveStyle({ left: '50%' });
      const match = dragger.getAttribute('style').match(/right:\s*calc\(([\d.]+)% - 1px\)/);
      expect(match).not.toBeNull();
      expect(parseFloat(match[1])).toBeCloseTo(20, 1);
    });
  });
});
