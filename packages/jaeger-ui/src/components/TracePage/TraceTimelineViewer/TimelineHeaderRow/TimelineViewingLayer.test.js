// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

import TimelineViewingLayer from './TimelineViewingLayer';

function mapFromSubRange(viewStart, viewEnd, value) {
  return viewStart + value * (viewEnd - viewStart);
}

describe('<TimelineViewingLayer /> (functional)', () => {
  const viewStart = 0.25;
  const viewEnd = 0.9;

  const baseProps = {
    boundsInvalidator: Math.random(),
    updateNextViewRangeTime: jest.fn(),
    updateViewRangeTime: jest.fn(),
    viewRangeTime: {
      current: [viewStart, viewEnd],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      left: 10,
      width: 100,
      top: 0,
      right: 110,
      bottom: 50,
      height: 50,
    }));
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<TimelineViewingLayer {...baseProps} />);
    expect(container.querySelector('.TimelineViewingLayer')).toBeInTheDocument();
  });

  describe('Draggable behavior', () => {
    it('updates cursor on mouse move', () => {
      const { container } = render(<TimelineViewingLayer {...baseProps} />);

      fireEvent.mouseMove(container.firstChild, { clientX: 60 });

      expect(baseProps.updateNextViewRangeTime).toHaveBeenCalledWith({
        cursor: expect.any(Number),
      });
    });

    it('clears cursor on mouse leave', () => {
      const { container } = render(<TimelineViewingLayer {...baseProps} />);

      fireEvent.mouseLeave(container.firstChild);

      expect(baseProps.updateNextViewRangeTime).toHaveBeenCalledWith({
        cursor: undefined,
      });
    });

    it('handles drag start', () => {
      const { container } = render(<TimelineViewingLayer {...baseProps} />);

      fireEvent.mouseDown(container.firstChild, { clientX: 60 });

      expect(baseProps.updateNextViewRangeTime).toHaveBeenCalledWith({
        reframe: {
          anchor: expect.any(Number),
          shift: expect.any(Number),
        },
      });
    });

    it('handles drag end and commits range', () => {
      const viewRangeTime = {
        ...baseProps.viewRangeTime,
        reframe: { anchor: 0.75, shift: 0.5 },
      };

      const { container } = render(<TimelineViewingLayer {...baseProps} viewRangeTime={viewRangeTime} />);

      fireEvent.mouseDown(container.firstChild, { clientX: 60 });
      fireEvent.mouseUp(container.firstChild, { clientX: 40 });

      const [start, end, source] = baseProps.updateViewRangeTime.mock.calls.at(-1);

      expect(start).toBeLessThanOrEqual(end);
      expect(source).toBe('timeline-header');
    });

    it('does not crash when boundsInvalidator changes', () => {
      const { rerender } = render(<TimelineViewingLayer {...baseProps} />);
      rerender(<TimelineViewingLayer {...baseProps} boundsInvalidator={Math.random()} />);
    });
  });

  describe('Rendering markers', () => {
    it('renders cursor guide when only cursor is set', () => {
      const cursor = mapFromSubRange(viewStart, viewEnd, 0.5);

      const { container } = render(
        <TimelineViewingLayer {...baseProps} viewRangeTime={{ ...baseProps.viewRangeTime, cursor }} />
      );

      expect(container.querySelector('.TimelineViewingLayer--cursorGuide')).toBeInTheDocument();
    });

    it('hides cursor when reframe or shift is active', () => {
      const cursor = mapFromSubRange(viewStart, viewEnd, 0.5);

      const cases = [
        { cursor, shiftStart: cursor },
        { cursor, shiftEnd: cursor },
        { cursor, reframe: { anchor: cursor, shift: cursor } },
      ];

      cases.forEach(viewRangeTime => {
        const { container } = render(
          <TimelineViewingLayer
            {...baseProps}
            viewRangeTime={{ ...baseProps.viewRangeTime, ...viewRangeTime }}
          />
        );

        expect(container.querySelector('.TimelineViewingLayer--cursorGuide')).not.toBeInTheDocument();

        cleanup();
      });
    });

    it('renders reframe dragging markers', () => {
      const { container } = render(
        <TimelineViewingLayer
          {...baseProps}
          viewRangeTime={{
            ...baseProps.viewRangeTime,
            reframe: { anchor: viewStart, shift: viewEnd },
          }}
        />
      );

      expect(container.querySelector('.isDraggingRight.isReframeDrag')).toBeInTheDocument();
    });

    it('renders shiftStart dragging', () => {
      const { container } = render(
        <TimelineViewingLayer
          {...baseProps}
          viewRangeTime={{
            ...baseProps.viewRangeTime,
            shiftStart: viewEnd,
          }}
        />
      );

      expect(container.querySelector('.isDraggingRight.isShiftDrag')).toBeInTheDocument();
    });

    it('renders shiftEnd dragging', () => {
      const { container } = render(
        <TimelineViewingLayer
          {...baseProps}
          viewRangeTime={{
            ...baseProps.viewRangeTime,
            shiftEnd: viewStart,
          }}
        />
      );

      expect(container.querySelector('.isDraggingLeft.isShiftDrag')).toBeInTheDocument();
    });
  });
});
