// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ViewingLayer, { dragTypes } from './ViewingLayer';
import { EUpdateTypes } from '../../../../utils/DraggableManager';

jest.mock('./Scrubber', () => props => <div data-testid="scrubber" {...props} />);

function getViewRange(viewStart, viewEnd) {
  return { time: { current: [viewStart, viewEnd] } };
}

describe('<SpanGraph>', () => {
  let props;
  let ref;
  let container;
  let rerender;

  beforeEach(() => {
    ref = React.createRef();
    props = {
      height: 60,
      numTicks: 5,
      updateNextViewRangeTime: jest.fn(),
      updateViewRangeTime: jest.fn(),
      viewRange: getViewRange(0, 1),
    };
    ({ container, rerender } = render(<ViewingLayer ref={ref} {...props} />));
  });

  describe('_getDraggingBounds()', () => {
    beforeEach(() => {
      ref.current._setRoot({ getBoundingClientRect: () => ({ left: 10, width: 100 }) });
      props.viewRange = getViewRange(0.1, 0.9);
      rerender(<ViewingLayer ref={ref} {...props} />);
    });

    it('throws if _root is not set', () => {
      ref.current._setRoot(null);
      expect(() => ref.current._getDraggingBounds(dragTypes.REFRAME)).toThrow();
    });

    it('returns the correct bounds for reframe', () => {
      expect(ref.current._getDraggingBounds(dragTypes.REFRAME)).toEqual({
        clientXLeft: 10,
        width: 100,
        maxValue: 1,
        minValue: 0,
      });
    });

    it('returns the correct bounds for shiftStart', () => {
      expect(ref.current._getDraggingBounds(dragTypes.SHIFT_START)).toEqual({
        clientXLeft: 10,
        width: 100,
        maxValue: 0.9,
        minValue: 0,
      });
    });

    it('returns the correct bounds for shiftEnd', () => {
      expect(ref.current._getDraggingBounds(dragTypes.SHIFT_END)).toEqual({
        clientXLeft: 10,
        width: 100,
        maxValue: 1,
        minValue: 0.1,
      });
    });

    it('calls getNextViewLayout via _getMarkers (from < to)', () => {
      expect(ref.current._getMarkers(0.1, 0.9, false)).toBeInstanceOf(Array);
    });

    it('calls getNextViewLayout via _getMarkers (from > to)', () => {
      expect(ref.current._getMarkers(0.9, 0.1, false)).toBeInstanceOf(Array);
    });

    it('calls getNextViewLayout via _getMarkers (from == to)', () => {
      expect(ref.current._getMarkers(0.5, 0.5, false)).toBeInstanceOf(Array);
    });

    it('throws in _handleScrubberDragEnd for unknown tag', () => {
      expect(() =>
        ref.current._handleScrubberDragEnd({ manager: { resetBounds: jest.fn() }, tag: 'random', value: 0.5 })
      ).toThrow('bad state');
    });

    it('renders the cursor guide when cursor is present and not prevented', () => {
      props.viewRange = {
        time: {
          current: [0, 1],
          cursor: 0.5,
        },
      };
      rerender(<ViewingLayer ref={ref} {...props} />);
      const guide = container.querySelector('.ViewingLayer--cursorGuide');
      expect(guide).toBeInTheDocument();
      expect(guide.getAttribute('x1')).toBe('50%');
    });
  });

  describe('DraggableManager callbacks', () => {
    describe('reframe', () => {
      it('handles mousemove', () => {
        ref.current._handleReframeMouseMove({ value: 0.5 });
        expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({ cursor: 0.5 });
      });

      it('handles mouseleave', () => {
        ref.current._handleReframeMouseLeave();
        expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({ cursor: null });
      });

      describe('drag update', () => {
        it('handles sans anchor', () => {
          ref.current._handleReframeDragUpdate({ value: 0.5 });
          expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({
            reframe: { anchor: 0.5, shift: 0.5 },
          });
        });

        it('handles the existing anchor', () => {
          props.viewRange.time.reframe = { anchor: 0.1 };
          rerender(<ViewingLayer ref={ref} {...props} />);
          ref.current._handleReframeDragUpdate({ value: 0.5 });
          expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({
            reframe: { anchor: 0.1, shift: 0.5 },
          });
        });
      });

      describe('drag end', () => {
        let manager;
        beforeEach(() => {
          manager = { resetBounds: jest.fn() };
        });

        it('handles sans anchor', () => {
          ref.current._handleReframeDragEnd({ manager, value: 0.5 });
          expect(manager.resetBounds).toHaveBeenCalled();
          expect(props.updateViewRangeTime).toHaveBeenLastCalledWith(0.5, 0.5, 'minimap');
        });

        it('handles dragged left (anchor is greater)', () => {
          props.viewRange.time.reframe = { anchor: 0.6 };
          rerender(<ViewingLayer ref={ref} {...props} />);
          ref.current._handleReframeDragEnd({ manager, value: 0.5 });
          expect(props.updateViewRangeTime).toHaveBeenLastCalledWith(0.5, 0.6, 'minimap');
        });

        it('handles dragged right (anchor is less)', () => {
          props.viewRange.time.reframe = { anchor: 0.4 };
          rerender(<ViewingLayer ref={ref} {...props} />);
          ref.current._handleReframeDragEnd({ manager, value: 0.5 });
          expect(props.updateViewRangeTime).toHaveBeenLastCalledWith(0.4, 0.5, 'minimap');
        });
      });
    });

    describe('scrubber', () => {
      beforeEach(() => {
        // Ensure cursor is visible by default so we can test it gets hidden
        // Must clone object to bypass React.memo shallow comparison
        const newTime = { ...props.viewRange.time, cursor: 0.5 };
        const newViewRange = { ...props.viewRange, time: newTime };
        props = { ...props, viewRange: newViewRange };
        rerender(<ViewingLayer ref={ref} {...props} />);
      });

      it('prevents the cursor from being drawn on scrubber mouseover', () => {
        fireEvent.mouseEnter(container.querySelectorAll('[data-testid="scrubber"]')[0]);
        expect(container.querySelector('.ViewingLayer--cursorGuide')).not.toBeInTheDocument();
      });

      it('prevents the cursor from being drawn on scrubber mouseleave', async () => {
        fireEvent.mouseLeave(container.querySelectorAll('[data-testid="scrubber"]')[0]);
        await waitFor(() =>
          expect(container.querySelector('.ViewingLayer--cursorGuide')).toBeInTheDocument()
        );
      });

      describe('drag start and update', () => {
        it('stops propagation on drag start', () => {
          const stopPropagation = jest.fn();
          ref.current._handleScrubberDragUpdate({
            event: { stopPropagation },
            type: EUpdateTypes.DragStart,
          });
          expect(stopPropagation).toHaveBeenCalled();
        });

        it('updates the viewRange for shiftStart and shiftEnd', () => {
          const moves = [
            { value: 0.5, tag: dragTypes.SHIFT_START },
            { value: 0.5, tag: dragTypes.SHIFT_END },
          ];
          moves.forEach(({ value, tag }) => {
            ref.current._handleScrubberDragUpdate({ value, tag, type: EUpdateTypes.DragMove });
            expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith(
              tag === dragTypes.SHIFT_START ? { shiftStart: 0.5 } : { shiftEnd: 0.5 }
            );
          });
        });
      });

      it('updates the view on drag end', async () => {
        const [start, end] = props.viewRange.time.current;
        const cases = [
          {
            update: { value: 0.5, tag: dragTypes.SHIFT_START, manager: { resetBounds: jest.fn() } },
            expectArgs: [0.5, end, 'minimap'],
          },
          {
            update: { value: 0.5, tag: dragTypes.SHIFT_END, manager: { resetBounds: jest.fn() } },
            expectArgs: [start, 0.5, 'minimap'],
          },
        ];

        for (const { update, expectArgs } of cases) {
          // Simulate hiding cursor first (e.g. dragging started)
          fireEvent.mouseEnter(container.querySelectorAll('[data-testid="scrubber"]')[0]);
          expect(container.querySelector('.ViewingLayer--cursorGuide')).not.toBeInTheDocument();

          // End drag
          ref.current._handleScrubberDragEnd(update);

          // Verify cursor returns
          await waitFor(() =>
            expect(container.querySelector('.ViewingLayer--cursorGuide')).toBeInTheDocument()
          );

          expect(update.manager.resetBounds).toHaveBeenCalled();
          expect(props.updateViewRangeTime).toHaveBeenLastCalledWith(...expectArgs);
        }
      });
    });
  });

  describe('.ViewingLayer--resetZoom', () => {
    it('should not render .ViewingLayer--resetZoom if props.viewRange.time.current = [0,1]', () => {
      expect(container.querySelector('.ViewingLayer--resetZoom')).toBeNull();
    });

    it('should render ViewingLayer--resetZoom if props.viewRange.time.current[0] !== 0', () => {
      props.viewRange = getViewRange(0.1, 1);
      rerender(<ViewingLayer ref={ref} {...props} />);
      expect(container.querySelector('.ViewingLayer--resetZoom')).toBeInTheDocument();
    });

    it('should render ViewingLayer--resetZoom if props.viewRange.time.current[1] !== 1', () => {
      props.viewRange = getViewRange(0, 0.9);
      rerender(<ViewingLayer ref={ref} {...props} />);
      expect(container.querySelector('.ViewingLayer--resetZoom')).toBeInTheDocument();
    });

    it('should call props.updateViewRangeTime when clicked', () => {
      props.viewRange = getViewRange(0.1, 0.9);
      rerender(<ViewingLayer ref={ref} {...props} />);
      fireEvent.click(container.querySelector('.ViewingLayer--resetZoom'));
      expect(props.updateViewRangeTime).toHaveBeenLastCalledWith(0, 1);
    });
  });

  it('renders a <GraphTicks />', () => {
    expect(container.querySelector('svg g')).toBeInTheDocument();
  });

  it('renders a filtering box if leftBound exists', () => {
    props.viewRange = getViewRange(0.2, 1);
    rerender(<ViewingLayer ref={ref} {...props} />);
    const box = container.querySelectorAll('.ViewingLayer--inactive')[0];
    expect(box).toBeInTheDocument();
    expect(Math.round(parseFloat(box.getAttribute('width')))).toBe(20);
    expect(box.getAttribute('x')).toBe('0');
  });

  it('renders a filtering box if rightBound exists', () => {
    props.viewRange = getViewRange(0, 0.8);
    rerender(<ViewingLayer ref={ref} {...props} />);
    const box = container.querySelectorAll('.ViewingLayer--inactive')[0];
    expect(box).toBeInTheDocument();
    expect(Math.round(parseFloat(box.getAttribute('width')))).toBe(20);
    expect(Math.round(parseFloat(box.getAttribute('x')))).toBe(80);
  });

  it('renders handles for the timeRangeFilter', () => {
    expect(container.querySelectorAll('[data-testid="scrubber"]').length).toBe(2);
  });
});
