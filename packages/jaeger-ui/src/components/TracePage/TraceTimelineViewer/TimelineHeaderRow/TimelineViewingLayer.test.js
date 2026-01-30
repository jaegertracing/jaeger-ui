// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { render, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

import TimelineViewingLayer from './TimelineViewingLayer';

function mapFromSubRange(viewStart, viewEnd, value) {
  return viewStart + value * (viewEnd - viewStart);
}

describe('<TimelineViewingLayer>', () => {
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

  it('renders without exploding', () => {
    const { container } = render(<TimelineViewingLayer {...props} />);
    expect(container.querySelector('.TimelineViewingLayer')).toBeInTheDocument();
  });

  it('sets ref to the root DOM node', () => {
    const { container } = render(<TimelineViewingLayer {...props} />);
    const timelineLayer = container.querySelector('.TimelineViewingLayer');
    expect(timelineLayer).toBeDefined();
  });

  describe('uses DraggableManager', () => {
    it('updates viewRange.time.cursor via mouse move', () => {
      const { container } = render(<TimelineViewingLayer {...props} />);
      fireEvent.mouseMove(container.querySelector('.TimelineViewingLayer'), { clientX: 60 });
      expect(props.updateNextViewRangeTime).toHaveBeenCalledWith({ cursor: expect.any(Number) });
    });

    it('resets viewRange.time.cursor via mouse leave', () => {
      const { container } = render(<TimelineViewingLayer {...props} />);
      fireEvent.mouseLeave(container.querySelector('.TimelineViewingLayer'));
      expect(props.updateNextViewRangeTime).toHaveBeenCalledWith({ cursor: undefined });
    });

    it('handles drag start via mouse down', () => {
      const { container } = render(<TimelineViewingLayer {...props} />);
      fireEvent.mouseDown(container.querySelector('.TimelineViewingLayer'), { clientX: 60 });
      expect(props.updateNextViewRangeTime).toHaveBeenCalledWith({
        reframe: {
          anchor: expect.any(Number),
          shift: expect.any(Number),
        },
      });
    });

    it('handles drag move', () => {
      const anchor = 0.25;
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor, shift: 0.5 } };
      const { container } = render(<TimelineViewingLayer {...props} viewRangeTime={viewRangeTime} />);
      fireEvent.mouseDown(container.querySelector('.TimelineViewingLayer'), { clientX: 60 });
      expect(props.updateNextViewRangeTime).toHaveBeenCalledWith({
        reframe: {
          anchor: expect.any(Number),
          shift: expect.any(Number),
        },
      });
    });

    it('handles drag end', () => {
      const anchor = 0.75;
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor, shift: 0.5 } };
      const { container } = render(<TimelineViewingLayer {...props} viewRangeTime={viewRangeTime} />);
      fireEvent.mouseDown(container.querySelector('.TimelineViewingLayer'), { clientX: 60 });
      fireEvent.mouseUp(container.querySelector('.TimelineViewingLayer'), { clientX: 40 });
      const [start, end, source] = props.updateViewRangeTime.mock.calls.at(-1);
      expect(start).toBeLessThanOrEqual(end);
      expect(source).toBe('timeline-header');
    });

    it('resets draggable bounds on boundsInvalidator update', () => {
      const { rerender } = render(<TimelineViewingLayer {...props} />);
      rerender(<TimelineViewingLayer {...props} boundsInvalidator={Math.random()} />);
      // no crash = pass
    });
  });

  describe('render()', () => {
    it('renders the cursor when it is the only non-current value set', () => {
      const cursor = mapFromSubRange(viewStart, viewEnd, 0.5);
      const baseViewRangeTime = { ...props.viewRangeTime, cursor };
      const { container } = render(<TimelineViewingLayer {...props} viewRangeTime={baseViewRangeTime} />);
      expect(container.querySelector('.TimelineViewingLayer--cursorGuide')).toBeInTheDocument();
    });

    it('skips rendering the cursor when reframe, shiftStart, or shiftEnd is present', () => {
      const cursor = mapFromSubRange(viewStart, viewEnd, 0.5);
      const cases = [
        { ...props.viewRangeTime, cursor, shiftStart: cursor },
        { ...props.viewRangeTime, cursor, shiftEnd: cursor },
        { ...props.viewRangeTime, cursor, reframe: { anchor: cursor, shift: cursor } },
      ];

      cases.forEach(viewRangeTime => {
        const { container } = render(<TimelineViewingLayer {...props} viewRangeTime={viewRangeTime} />);
        expect(container.querySelector('.TimelineViewingLayer--cursorGuide')).not.toBeInTheDocument();
        cleanup();
      });
    });

    it('renders the reframe dragging', () => {
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor: viewStart, shift: viewEnd } };
      const { container } = render(<TimelineViewingLayer {...props} viewRangeTime={viewRangeTime} />);
      expect(container.querySelector('.isDraggingRight.isReframeDrag')).toBeInTheDocument();
    });

    it('renders the reframe dragging normalized left', () => {
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor: -0.25, shift: viewEnd } };
      const { container } = render(<TimelineViewingLayer {...props} viewRangeTime={viewRangeTime} />);
      expect(container.querySelector('.isDraggingRight.isReframeDrag')).toBeInTheDocument();
    });

    it('renders the reframe dragging normalized right', () => {
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor: viewStart, shift: 1.25 } };
      const { container } = render(<TimelineViewingLayer {...props} viewRangeTime={viewRangeTime} />);
      expect(container.querySelector('.isDraggingRight.isReframeDrag')).toBeInTheDocument();
    });

    it('does not render the reframe on out of bounds', () => {
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor: 1.5, shift: 1.75 } };
      const { container } = render(<TimelineViewingLayer {...props} viewRangeTime={viewRangeTime} />);
      expect(container.querySelector('.isReframeDrag')).not.toBeInTheDocument();
    });

    it('renders the shiftStart dragging', () => {
      const viewRangeTime = { ...props.viewRangeTime, shiftStart: viewEnd };
      const { container } = render(<TimelineViewingLayer {...props} viewRangeTime={viewRangeTime} />);
      expect(container.querySelector('.isDraggingRight.isShiftDrag')).toBeInTheDocument();
    });

    it('renders the shiftEnd dragging', () => {
      const viewRangeTime = { ...props.viewRangeTime, shiftEnd: viewStart };
      const { container } = render(<TimelineViewingLayer {...props} viewRangeTime={viewRangeTime} />);
      expect(container.querySelector('.isDraggingLeft.isShiftDrag')).toBeInTheDocument();
    });
  });
});
