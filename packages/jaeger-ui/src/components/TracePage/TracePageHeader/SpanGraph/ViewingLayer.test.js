// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ViewingLayer from './ViewingLayer';

jest.mock('./Scrubber', () => props => (
  <g
    data-testid="scrubber"
    onMouseDown={props.onMouseDown}
    onMouseEnter={props.onMouseEnter}
    onMouseLeave={props.onMouseLeave}
  >
    <rect />
  </g>
));

function getViewRange(viewStart, viewEnd) {
  return { time: { current: [viewStart, viewEnd] } };
}

describe('<SpanGraph>', () => {
  let props;
  let container;
  let rerender;

  beforeEach(() => {
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      left: 10,
      width: 100,
      top: 0,
      right: 110,
      bottom: 60,
      height: 60,
    }));

    props = {
      height: 60,
      numTicks: 5,
      updateNextViewRangeTime: jest.fn(),
      updateViewRangeTime: jest.fn(),
      viewRange: getViewRange(0, 1),
    };
    ({ container, rerender } = render(<ViewingLayer {...props} />));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('cursor guide rendering', () => {
    it('renders the cursor guide when cursor is present', () => {
      props.viewRange = {
        time: {
          current: [0, 1],
          cursor: 0.5,
        },
      };
      rerender(<ViewingLayer {...props} />);
      const guide = container.querySelector('.ViewingLayer--cursorGuide');
      expect(guide).toBeInTheDocument();
      expect(guide.getAttribute('x1')).toBe('50%');
    });

    it('does not render cursor guide when hovering over scrubber', () => {
      props.viewRange = {
        time: {
          current: [0, 1],
          cursor: 0.5,
        },
      };
      rerender(<ViewingLayer {...props} />);

      const scrubber = container.querySelectorAll('[data-testid="scrubber"]')[0];
      fireEvent.mouseEnter(scrubber);

      expect(container.querySelector('.ViewingLayer--cursorGuide')).not.toBeInTheDocument();
    });

    it('shows cursor guide again after leaving scrubber', () => {
      props.viewRange = {
        time: {
          current: [0, 1],
          cursor: 0.5,
        },
      };
      rerender(<ViewingLayer {...props} />);

      const scrubber = container.querySelectorAll('[data-testid="scrubber"]')[0];
      fireEvent.mouseEnter(scrubber);
      fireEvent.mouseLeave(scrubber);

      expect(container.querySelector('.ViewingLayer--cursorGuide')).toBeInTheDocument();
    });
  });

  describe('reframe interactions', () => {
    it('updates cursor position on mousemove', () => {
      const svg = container.querySelector('.ViewingLayer--graph');
      fireEvent.mouseMove(svg, { clientX: 60 });
      expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({ cursor: expect.any(Number) });
    });

    it('clears cursor on mouseleave', () => {
      const svg = container.querySelector('.ViewingLayer--graph');
      fireEvent.mouseLeave(svg);
      expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({ cursor: null });
    });

    it('starts reframe drag on mousedown', () => {
      const svg = container.querySelector('.ViewingLayer--graph');
      fireEvent.mouseDown(svg, { clientX: 60 });
      expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({
        reframe: { anchor: expect.any(Number), shift: expect.any(Number) },
      });
    });

    it('updates reframe during drag', () => {
      props.viewRange.time.reframe = { anchor: 0.1, shift: 0.3 };
      rerender(<ViewingLayer {...props} />);

      const svg = container.querySelector('.ViewingLayer--graph');
      fireEvent.mouseDown(svg, { clientX: 60 });

      expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({
        reframe: { anchor: expect.any(Number), shift: expect.any(Number) },
      });
    });

    it('completes reframe on mouseup', () => {
      const svg = container.querySelector('.ViewingLayer--graph');
      fireEvent.mouseDown(svg, { clientX: 60 });
      fireEvent.mouseUp(svg, { clientX: 80 });

      expect(props.updateViewRangeTime).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        'minimap'
      );
    });

    it('handles reframe with existing anchor (drag left)', () => {
      props.viewRange.time.reframe = { anchor: 0.6, shift: 0.5 };
      rerender(<ViewingLayer {...props} />);

      const svg = container.querySelector('.ViewingLayer--graph');
      fireEvent.mouseUp(svg, { clientX: 50 });

      const calls = props.updateViewRangeTime.mock.calls;
      if (calls.length > 0) {
        const [start, end, source] = calls[calls.length - 1];
        expect(start).toBeLessThanOrEqual(end);
        expect(source).toBe('minimap');
      }
    });

    it('handles reframe with existing anchor (drag right)', () => {
      props.viewRange.time.reframe = { anchor: 0.4, shift: 0.5 };
      rerender(<ViewingLayer {...props} />);

      const svg = container.querySelector('.ViewingLayer--graph');
      fireEvent.mouseUp(svg, { clientX: 60 });

      const calls = props.updateViewRangeTime.mock.calls;
      if (calls.length > 0) {
        const [start, end, source] = calls[calls.length - 1];
        expect(start).toBeLessThanOrEqual(end);
        expect(source).toBe('minimap');
      }
    });
  });

  describe('scrubber interactions', () => {
    it('updates shiftStart during drag', () => {
      const leftScrubber = container.querySelectorAll('[data-testid="scrubber"]')[0];
      fireEvent.mouseDown(leftScrubber, { clientX: 60 });
      fireEvent.mouseMove(leftScrubber, { clientX: 70 });

      const calls = props.updateNextViewRangeTime.mock.calls.filter(
        call => call[0]?.shiftStart !== undefined
      );
      expect(calls.length).toBeGreaterThan(0);
    });

    it('updates shiftEnd during drag', () => {
      const rightScrubber = container.querySelectorAll('[data-testid="scrubber"]')[1];
      fireEvent.mouseDown(rightScrubber, { clientX: 60 });
      fireEvent.mouseMove(rightScrubber, { clientX: 70 });

      const calls = props.updateNextViewRangeTime.mock.calls.filter(call => call[0]?.shiftEnd !== undefined);
      expect(calls.length).toBeGreaterThan(0);
    });

    it('completes shiftStart on mouseup', () => {
      const leftScrubber = container.querySelectorAll('[data-testid="scrubber"]')[0];
      fireEvent.mouseDown(leftScrubber, { clientX: 60 });
      fireEvent.mouseUp(leftScrubber, { clientX: 70 });

      expect(props.updateViewRangeTime).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        'minimap'
      );
    });

    it('completes shiftEnd on mouseup', () => {
      const rightScrubber = container.querySelectorAll('[data-testid="scrubber"]')[1];
      fireEvent.mouseDown(rightScrubber, { clientX: 60 });
      fireEvent.mouseUp(rightScrubber, { clientX: 70 });

      expect(props.updateViewRangeTime).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        'minimap'
      );
    });
  });

  describe('.ViewingLayer--resetZoom', () => {
    it('should not render .ViewingLayer--resetZoom if props.viewRange.time.current = [0,1]', () => {
      expect(container.querySelector('.ViewingLayer--resetZoom')).toBeNull();
    });

    it('should render ViewingLayer--resetZoom if props.viewRange.time.current[0] !== 0', () => {
      props.viewRange = getViewRange(0.1, 1);
      rerender(<ViewingLayer {...props} />);
      expect(container.querySelector('.ViewingLayer--resetZoom')).toBeInTheDocument();
    });

    it('should render ViewingLayer--resetZoom if props.viewRange.time.current[1] !== 1', () => {
      props.viewRange = getViewRange(0, 0.9);
      rerender(<ViewingLayer {...props} />);
      expect(container.querySelector('.ViewingLayer--resetZoom')).toBeInTheDocument();
    });

    it('should call props.updateViewRangeTime when clicked', () => {
      props.viewRange = getViewRange(0.1, 0.9);
      rerender(<ViewingLayer {...props} />);
      fireEvent.click(container.querySelector('.ViewingLayer--resetZoom'));
      expect(props.updateViewRangeTime).toHaveBeenLastCalledWith(0, 1);
    });
  });

  it('renders a <GraphTicks />', () => {
    expect(container.querySelector('svg g')).toBeInTheDocument();
  });

  it('renders a filtering box if leftBound exists', () => {
    props.viewRange = getViewRange(0.2, 1);
    rerender(<ViewingLayer {...props} />);
    const box = container.querySelectorAll('.ViewingLayer--inactive')[0];
    expect(box).toBeInTheDocument();
    expect(Math.round(parseFloat(box.getAttribute('width')))).toBe(20);
    expect(box.getAttribute('x')).toBe('0');
  });

  it('renders a filtering box if rightBound exists', () => {
    props.viewRange = getViewRange(0, 0.8);
    rerender(<ViewingLayer {...props} />);
    const box = container.querySelectorAll('.ViewingLayer--inactive')[0];
    expect(box).toBeInTheDocument();
    expect(Math.round(parseFloat(box.getAttribute('width')))).toBe(20);
    expect(Math.round(parseFloat(box.getAttribute('x')))).toBe(80);
  });

  it('renders handles for the timeRangeFilter', () => {
    expect(container.querySelectorAll('[data-testid="scrubber"]').length).toBe(2);
  });

  describe('visual markers', () => {
    it('renders reframe markers when reframe is active', () => {
      props.viewRange.time.reframe = { anchor: 0.3, shift: 0.7 };
      rerender(<ViewingLayer {...props} />);
      expect(container.querySelector('.ViewingLayer--draggedShift.isReframeDrag')).toBeInTheDocument();
    });

    it('renders shiftStart markers when dragging left scrubber', () => {
      props.viewRange.time.shiftStart = 0.3;
      rerender(<ViewingLayer {...props} />);
      expect(container.querySelector('.ViewingLayer--draggedShift.isShiftDrag')).toBeInTheDocument();
    });

    it('renders shiftEnd markers when dragging right scrubber', () => {
      props.viewRange.time.shiftEnd = 0.7;
      rerender(<ViewingLayer {...props} />);
      expect(container.querySelector('.ViewingLayer--draggedShift.isShiftDrag')).toBeInTheDocument();
    });

    it('renders full overlay when next time range exists', () => {
      props.viewRange.time.reframe = { anchor: 0.3, shift: 0.7 };
      rerender(<ViewingLayer {...props} />);
      expect(container.querySelector('.ViewingLayer--fullOverlay')).toBeInTheDocument();
    });
  });
});
