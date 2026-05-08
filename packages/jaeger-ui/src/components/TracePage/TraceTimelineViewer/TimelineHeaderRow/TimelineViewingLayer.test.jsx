// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

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
      this.handleMouseDown = vi.fn();
      this.handleMouseLeave = vi.fn();
      this.handleMouseMove = vi.fn();
      this.resetBounds = vi.fn();
      this.dispose = vi.fn();
      draggerInstances.push(this);
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
  return draggerInstances[0];
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

    Element.prototype.getBoundingClientRect = vi.fn(() => ({
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
    const timelineLayer = container.querySelector('.TimelineViewingLayer');
    const dragger = getDragger();

    fireEvent.mouseDown(timelineLayer);
    fireEvent.mouseLeave(timelineLayer);
    fireEvent.mouseMove(timelineLayer);

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
      render(<TimelineViewingLayer {...props} />);
      getDragger()._opts.onMouseMove({ value: 0.5 });
      expect(props.updateNextViewRangeTime).toHaveBeenCalledWith({
        cursor: mapFromSubRange(viewStart, viewEnd, 0.5),
      });
    });

    it('clears viewRangeTime.cursor on mouse leave', () => {
      render(<TimelineViewingLayer {...props} />);
      getDragger()._opts.onMouseLeave();
      expect(props.updateNextViewRangeTime).toHaveBeenCalledWith({ cursor: undefined });
    });

    it('handles drag start without an existing anchor', () => {
      render(<TimelineViewingLayer {...props} />);
      getDragger()._opts.onDragStart({ value: 0.5 });
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
