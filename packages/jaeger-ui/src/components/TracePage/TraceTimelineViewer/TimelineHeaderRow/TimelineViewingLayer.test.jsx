// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const { draggerInstances } = vi.hoisted(() => {
  const draggerInstances = [];
  return { draggerInstances };
});

vi.mock('../../../../utils/DraggableManager', async () => {
  const actual = await vi.importActual('../../../../utils/DraggableManager');

  class MockDraggableManager {
    constructor(opts) {
      this._opts = opts;
      this.getBounds = opts.getBounds;
      this.handleMouseDown = vi.fn(event => {
        opts.onDragStart?.({ manager: this, value: this._getValue(event) });
      });
      this.handleMouseLeave = vi.fn(() => {
        opts.onMouseLeave?.({ manager: this });
      });
      this.handleMouseMove = vi.fn(event => {
        opts.onMouseMove?.({ manager: this, value: this._getValue(event) });
      });
      this.resetBounds = vi.fn();
      this.dispose = vi.fn();
      draggerInstances.push(this);
    }

    _getValue(event) {
      const { clientXLeft, width } = this.getBounds();
      return (event.clientX - clientXLeft) / width;
    }
  }

  return {
    ...actual,
    default: MockDraggableManager,
  };
});

import TimelineViewingLayer from './TimelineViewingLayer';

function mapFromSubRange(viewStart, viewEnd, value) {
  return viewStart + value * (viewEnd - viewStart);
}

function getDragger() {
  if (draggerInstances.length !== 1) {
    throw new Error(
      `Expected exactly one MockDraggableManager instance, but found ${draggerInstances.length}.`
    );
  }
  return draggerInstances[0];
}

function getTimelineLayer(container) {
  const timelineLayer = container.querySelector('.TimelineViewingLayer');
  expect(timelineLayer).toBeInTheDocument();
  return timelineLayer;
}

describe('<TimelineViewingLayer>', () => {
  const viewStart = 0.25;
  const viewEnd = 0.9;
  let props;

  beforeEach(() => {
    draggerInstances.length = 0;
    props = {
      boundsInvalidator: Math.random(),
      updateNextViewRangeTime: vi.fn(),
      updateViewRangeTime: vi.fn(),
      viewRangeTime: {
        current: [viewStart, viewEnd],
      },
    };

    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(() => ({
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
    vi.restoreAllMocks();
  });

  it('renders without exploding', () => {
    const { container } = render(<TimelineViewingLayer {...props} />);
    expect(container.querySelector('.TimelineViewingLayer')).toBeInTheDocument();
  });

  it('wires DOM mouse events to the DraggableManager handlers', () => {
    const { container } = render(<TimelineViewingLayer {...props} />);
    const timelineLayer = getTimelineLayer(container);
    const dragger = getDragger();

    fireEvent.mouseDown(timelineLayer, { clientX: 60 });
    fireEvent.mouseLeave(timelineLayer);
    fireEvent.mouseMove(timelineLayer, { clientX: 60 });

    expect(dragger.handleMouseDown).toHaveBeenCalled();
    expect(dragger.handleMouseLeave).toHaveBeenCalled();
    expect(dragger.handleMouseMove).toHaveBeenCalled();
  });

  describe('DraggableManager callbacks', () => {
    it('returns the dragging bounds from the root DOM node', () => {
      render(<TimelineViewingLayer {...props} />);
      expect(getDragger().getBounds()).toEqual({ clientXLeft: 10, width: 100 });
    });

    it('throws error when dragging bounds are requested after unmount', () => {
      const { unmount } = render(<TimelineViewingLayer {...props} />);
      const dragger = getDragger();

      unmount();

      expect(() => dragger.getBounds()).toThrow(
        'Component must be mounted in order to determine DraggableBounds'
      );
    });

    it('updates viewRangeTime.cursor on mouse move', () => {
      const { container } = render(<TimelineViewingLayer {...props} />);
      fireEvent.mouseMove(getTimelineLayer(container), { clientX: 60 });
      expect(props.updateNextViewRangeTime).toHaveBeenCalledWith({
        cursor: mapFromSubRange(viewStart, viewEnd, 0.5),
      });
    });

    it('clears viewRangeTime.cursor on mouse leave', () => {
      const { container } = render(<TimelineViewingLayer {...props} />);
      fireEvent.mouseLeave(getTimelineLayer(container));
      expect(props.updateNextViewRangeTime).toHaveBeenCalledWith({ cursor: undefined });
    });

    it('handles drag start without an existing anchor', () => {
      const { container } = render(<TimelineViewingLayer {...props} />);
      fireEvent.mouseDown(getTimelineLayer(container), { clientX: 60 });
      const shift = mapFromSubRange(viewStart, viewEnd, 0.5);

      expect(props.updateNextViewRangeTime).toHaveBeenCalledWith({
        reframe: { anchor: shift, shift },
      });
    });

    it('uses the latest reframe anchor after props update', () => {
      const { rerender } = render(<TimelineViewingLayer {...props} />);
      const anchor = 0.75;
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor, shift: 0.5 } };

      rerender(<TimelineViewingLayer {...props} viewRangeTime={viewRangeTime} />);
      getDragger()._opts.onDragMove({ value: 0.5 });

      expect(props.updateNextViewRangeTime).toHaveBeenCalledWith({
        reframe: { anchor, shift: mapFromSubRange(viewStart, viewEnd, 0.5) },
      });
    });

    it('handles drag end and orders the resulting range', () => {
      const anchor = 0.75;
      const manager = { resetBounds: vi.fn() };
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor, shift: 0.5 } };

      render(<TimelineViewingLayer {...props} viewRangeTime={viewRangeTime} />);
      getDragger()._opts.onDragEnd({ manager, value: 0.25 });

      expect(manager.resetBounds).toHaveBeenCalled();
      expect(props.updateViewRangeTime).toHaveBeenCalledWith(
        mapFromSubRange(viewStart, viewEnd, 0.25),
        anchor,
        'timeline-header'
      );
    });

    it('resets draggable bounds when boundsInvalidator changes', () => {
      const { rerender } = render(<TimelineViewingLayer {...props} />);
      const dragger = getDragger();

      rerender(<TimelineViewingLayer {...props} boundsInvalidator={Math.random()} />);

      expect(dragger.resetBounds).toHaveBeenCalled();
    });

    it('disposes the DraggableManager on unmount', () => {
      const { unmount } = render(<TimelineViewingLayer {...props} />);
      const dragger = getDragger();

      unmount();

      expect(dragger.dispose).toHaveBeenCalled();
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
