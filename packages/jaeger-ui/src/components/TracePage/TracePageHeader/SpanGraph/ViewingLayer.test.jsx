// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ViewingLayer from './ViewingLayer';
import DraggableManager from '../../../../utils/DraggableManager';

vi.mock('./Scrubber', () => mockDefault(props => <div data-testid="scrubber" {...props} />));

function getViewRange(viewStart, viewEnd) {
  return { time: { current: [viewStart, viewEnd] } };
}

describe('<SpanGraph>', () => {
  let props;
  let ref;
  let container;
  let rerender;

  const getGraph = () => container.querySelector('.ViewingLayer--graph');
  const getScrubbers = () => container.querySelectorAll('[data-testid="scrubber"]');

  beforeEach(() => {
    ref = React.createRef();
    props = {
      height: 60,
      numTicks: 5,
      updateNextViewRangeTime: jest.fn(),
      updateViewRangeTime: jest.fn(),
      viewRange: getViewRange(0, 1),
    };
    vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 10, width: 100 });
    ({ container, rerender } = render(<ViewingLayer ref={ref} {...props} />));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('_getDraggingBounds()', () => {
    beforeEach(() => {
      props.viewRange = getViewRange(0.1, 0.9);
      rerender(<ViewingLayer ref={ref} {...props} />);
    });

    it('returns the correct bounds for reframe', () => {
      fireEvent.mouseDown(getGraph(), { button: 0, clientX: 60 });
      props.viewRange = {
        time: { ...props.viewRange.time, reframe: { anchor: 0.5, shift: 0.5 } },
      };
      rerender(<ViewingLayer ref={ref} {...props} />);

      fireEvent.mouseMove(window, { button: 0, clientX: 35 });
      expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({
        reframe: { anchor: 0.5, shift: 0.25 },
      });
      fireEvent.mouseMove(window, { button: 0, clientX: -10 });
      expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({
        reframe: { anchor: 0.5, shift: 0 },
      });
      fireEvent.mouseMove(window, { button: 0, clientX: 120 });
      expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({
        reframe: { anchor: 0.5, shift: 1 },
      });
      fireEvent.mouseUp(window, { button: 0, clientX: 120 });
      expect(props.updateViewRangeTime).toHaveBeenLastCalledWith(0.5, 1, 'minimap');
    });

    it('returns the correct bounds for shiftStart', () => {
      fireEvent.mouseDown(getScrubbers()[0], { button: 0, clientX: 20 });
      fireEvent.mouseMove(window, { button: 0, clientX: 35 });
      expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({ shiftStart: 0.25 });
      fireEvent.mouseMove(window, { button: 0, clientX: -10 });
      expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({ shiftStart: 0 });
      fireEvent.mouseMove(window, { button: 0, clientX: 120 });
      expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({ shiftStart: 0.9 });
      fireEvent.mouseUp(window, { button: 0, clientX: 120 });
      expect(props.updateViewRangeTime).toHaveBeenLastCalledWith(0.9, 0.9, 'minimap');
    });

    it('returns the correct bounds for shiftEnd', () => {
      fireEvent.mouseDown(getScrubbers()[1], { button: 0, clientX: 100 });
      fireEvent.mouseMove(window, { button: 0, clientX: 85 });
      expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({ shiftEnd: 0.75 });
      fireEvent.mouseMove(window, { button: 0, clientX: -10 });
      expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({ shiftEnd: 0.1 });
      fireEvent.mouseMove(window, { button: 0, clientX: 120 });
      expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({ shiftEnd: 1 });
      fireEvent.mouseUp(window, { button: 0, clientX: 120 });
      expect(props.updateViewRangeTime).toHaveBeenLastCalledWith(0.1, 1, 'minimap');
    });

    it('calls getNextViewLayout via _getMarkers (from < to)', () => {
      props.viewRange = {
        time: { ...props.viewRange.time, reframe: { anchor: 0.1, shift: 0.9 } },
      };
      rerender(<ViewingLayer ref={ref} {...props} />);

      const [shift, edge] = container.querySelectorAll(
        '.ViewingLayer--draggedShift, .ViewingLayer--draggedEdge'
      );
      expect(shift).toHaveAttribute('x', '10%');
      expect(shift).toHaveAttribute('width', '80%');
      expect(edge).toHaveAttribute('x', '90%');
    });

    it('calls getNextViewLayout via _getMarkers (from > to)', () => {
      props.viewRange = {
        time: { ...props.viewRange.time, reframe: { anchor: 0.9, shift: 0.1 } },
      };
      rerender(<ViewingLayer ref={ref} {...props} />);

      const [shift, edge] = container.querySelectorAll(
        '.ViewingLayer--draggedShift, .ViewingLayer--draggedEdge'
      );
      expect(shift).toHaveAttribute('x', '10%');
      expect(shift).toHaveAttribute('width', '80%');
      expect(edge).toHaveAttribute('x', '10%');
    });

    it('calls getNextViewLayout via _getMarkers (from == to)', () => {
      props.viewRange = {
        time: { ...props.viewRange.time, reframe: { anchor: 0.5, shift: 0.5 } },
      };
      rerender(<ViewingLayer ref={ref} {...props} />);

      const [shift, edge] = container.querySelectorAll(
        '.ViewingLayer--draggedShift, .ViewingLayer--draggedEdge'
      );
      expect(shift).toHaveAttribute('x', '50%');
      expect(shift).toHaveAttribute('width', '0%');
      expect(edge).toHaveAttribute('x', '50%');
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
        fireEvent.mouseMove(getGraph(), { clientX: 60 });
        expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({ cursor: 0.5 });
      });

      it('handles mouseleave', () => {
        fireEvent.mouseLeave(getGraph(), { clientX: 60 });
        expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({ cursor: null });
      });

      describe('drag update', () => {
        it('handles sans anchor', () => {
          fireEvent.mouseDown(getGraph(), { button: 0, clientX: 60 });
          expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({
            reframe: { anchor: 0.5, shift: 0.5 },
          });
          fireEvent.mouseUp(window, { button: 0, clientX: 60 });
        });

        it('handles the existing anchor', () => {
          props.viewRange = {
            time: { ...props.viewRange.time, reframe: { anchor: 0.1, shift: 0.2 } },
          };
          rerender(<ViewingLayer ref={ref} {...props} />);
          fireEvent.mouseDown(getGraph(), { button: 0, clientX: 20 });
          fireEvent.mouseMove(window, { button: 0, clientX: 60 });
          expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({
            reframe: { anchor: 0.1, shift: 0.5 },
          });
          fireEvent.mouseUp(window, { button: 0, clientX: 60 });
        });
      });

      describe('drag end', () => {
        it('handles sans anchor', () => {
          fireEvent.mouseDown(getGraph(), { button: 0, clientX: 60 });
          fireEvent.mouseUp(window, { button: 0, clientX: 60 });
          expect(props.updateViewRangeTime).toHaveBeenLastCalledWith(0.5, 0.5, 'minimap');

          SVGSVGElement.prototype.getBoundingClientRect.mockReturnValue({ left: 60, width: 100 });
          fireEvent.mouseMove(getGraph(), { clientX: 110 });
          expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({ cursor: 0.5 });
        });

        it('handles dragged left (anchor is greater)', () => {
          props.viewRange = {
            time: { ...props.viewRange.time, reframe: { anchor: 0.6, shift: 0.7 } },
          };
          rerender(<ViewingLayer ref={ref} {...props} />);
          fireEvent.mouseDown(getGraph(), { button: 0, clientX: 70 });
          fireEvent.mouseUp(window, { button: 0, clientX: 60 });
          expect(props.updateViewRangeTime).toHaveBeenLastCalledWith(0.5, 0.6, 'minimap');
        });

        it('handles dragged right (anchor is less)', () => {
          props.viewRange = {
            time: { ...props.viewRange.time, reframe: { anchor: 0.4, shift: 0.3 } },
          };
          rerender(<ViewingLayer ref={ref} {...props} />);
          fireEvent.mouseDown(getGraph(), { button: 0, clientX: 50 });
          fireEvent.mouseUp(window, { button: 0, clientX: 60 });
          expect(props.updateViewRangeTime).toHaveBeenLastCalledWith(0.4, 0.5, 'minimap');
        });
      });
    });

    describe('scrubber', () => {
      it('prevents the cursor from being drawn on scrubber mouseover', () => {
        props.viewRange = { time: { ...props.viewRange.time, cursor: 0.5 } };
        rerender(<ViewingLayer ref={ref} {...props} />);

        expect(container.querySelector('.ViewingLayer--cursorGuide')).toHaveAttribute('x1', '50%');
        fireEvent.mouseEnter(getScrubbers()[0]);
        expect(container.querySelector('.ViewingLayer--cursorGuide')).not.toBeInTheDocument();
      });

      it('prevents the cursor from being drawn on scrubber mouseleave', () => {
        props.viewRange = { time: { ...props.viewRange.time, cursor: 0.5 } };
        rerender(<ViewingLayer ref={ref} {...props} />);

        const scrubber = getScrubbers()[0];
        fireEvent.mouseEnter(scrubber);
        expect(container.querySelector('.ViewingLayer--cursorGuide')).not.toBeInTheDocument();
        fireEvent.mouseLeave(scrubber);
        expect(container.querySelector('.ViewingLayer--cursorGuide')).toHaveAttribute('x1', '50%');
      });

      describe('drag start and update', () => {
        it('stops propagation on drag start', () => {
          fireEvent.mouseDown(getScrubbers()[0], { button: 0, clientX: 10 });

          // A bubbled svg mousedown would add a reframe update.
          expect(props.updateNextViewRangeTime).toHaveBeenCalledTimes(1);
          expect(props.updateNextViewRangeTime).toHaveBeenCalledWith({ shiftStart: 0 });
          fireEvent.mouseUp(window, { button: 0, clientX: 10 });
        });

        it('updates the viewRange for shiftStart and shiftEnd', () => {
          const moves = [
            { index: 0, startClientX: 10, expectedUpdate: { shiftStart: 0.5 } },
            { index: 1, startClientX: 110, expectedUpdate: { shiftEnd: 0.5 } },
          ];
          moves.forEach(({ index, startClientX, expectedUpdate }) => {
            fireEvent.mouseDown(getScrubbers()[index], { button: 0, clientX: startClientX });
            fireEvent.mouseMove(window, { button: 0, clientX: 60 });
            expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith(expectedUpdate);
            fireEvent.mouseUp(window, { button: 0, clientX: 60 });
          });
        });
      });

      it('updates the view on drag end', () => {
        const cases = [
          {
            index: 0,
            startClientX: 20,
            expectArgs: [0.5, 0.9, 'minimap'],
            nextRange: [0.1, 1],
            nextClientX: 120,
            nextExpectArgs: [1, 1, 'minimap'],
          },
          {
            index: 1,
            startClientX: 100,
            expectArgs: [0.1, 0.5, 'minimap'],
            nextRange: [0, 0.9],
            nextClientX: 0,
            nextExpectArgs: [0, 0, 'minimap'],
          },
        ];
        cases.forEach(({ index, startClientX, expectArgs, nextRange, nextClientX, nextExpectArgs }) => {
          props.viewRange = { time: { current: [0.1, 0.9], cursor: 0.5 } };
          rerender(<ViewingLayer ref={ref} {...props} />);
          let scrubber = getScrubbers()[index];

          fireEvent.mouseEnter(scrubber, { clientX: startClientX });
          expect(container.querySelector('.ViewingLayer--cursorGuide')).not.toBeInTheDocument();
          fireEvent.mouseDown(scrubber, { button: 0, clientX: startClientX });
          fireEvent.mouseMove(window, { button: 0, clientX: 60 });
          // Mouseleave is ignored mid-drag, so mouseup must restore the guide.
          fireEvent.mouseLeave(scrubber, { clientX: 60 });
          fireEvent.mouseUp(window, { button: 0, clientX: 60 });

          expect(container.querySelector('.ViewingLayer--cursorGuide')).toHaveAttribute('x1', '50%');
          expect(props.updateViewRangeTime).toHaveBeenLastCalledWith(...expectArgs);

          props.viewRange = { time: { current: nextRange, cursor: 0.5 } };
          rerender(<ViewingLayer ref={ref} {...props} />);
          scrubber = getScrubbers()[index];
          fireEvent.mouseDown(scrubber, { button: 0, clientX: startClientX });
          fireEvent.mouseMove(window, { button: 0, clientX: nextClientX });
          fireEvent.mouseUp(window, { button: 0, clientX: nextClientX });
          expect(props.updateViewRangeTime).toHaveBeenLastCalledWith(...nextExpectArgs);
        });
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

describe('<ViewingLayer /> hooks', () => {
  const makeProps = overrides => ({
    height: 60,
    numTicks: 5,
    updateNextViewRangeTime: vi.fn(),
    updateViewRangeTime: vi.fn(),
    viewRange: getViewRange(0, 1),
    ...overrides,
  });

  beforeEach(() => {
    vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 10, width: 100 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('disposes all drag managers and removes their window listeners on unmount', () => {
    const dispose = vi.spyOn(DraggableManager.prototype, 'dispose');
    const props = makeProps();
    const { container, unmount } = render(<ViewingLayer {...props} />);
    const graph = container.querySelector('.ViewingLayer--graph');

    fireEvent.mouseDown(graph, { button: 0, clientX: 40 });
    props.updateNextViewRangeTime.mockClear();
    props.updateViewRangeTime.mockClear();
    unmount();

    expect(dispose).toHaveBeenCalledTimes(3);
    fireEvent.mouseMove(window, { button: 0, clientX: 70 });
    fireEvent.mouseUp(window, { button: 0, clientX: 70 });
    expect(props.updateNextViewRangeTime).not.toHaveBeenCalled();
    expect(props.updateViewRangeTime).not.toHaveBeenCalled();
  });

  it('keeps managers stable during rerenders and uses the latest drag props', () => {
    const dispose = vi.spyOn(DraggableManager.prototype, 'dispose');
    const initialProps = makeProps({ viewRange: getViewRange(0.1, 0.9) });
    const { container, rerender } = render(<ViewingLayer {...initialProps} />);
    const startScrubber = container.querySelectorAll('[data-testid="scrubber"]')[0];

    fireEvent.mouseDown(startScrubber, { button: 0, clientX: 20 });
    initialProps.updateNextViewRangeTime.mockClear();
    initialProps.updateViewRangeTime.mockClear();

    const nextProps = makeProps({ viewRange: getViewRange(0.2, 0.8) });
    rerender(<ViewingLayer {...nextProps} />);
    fireEvent.mouseMove(window, { button: 0, clientX: 60 });
    fireEvent.mouseUp(window, { button: 0, clientX: 60 });

    expect(dispose).not.toHaveBeenCalled();
    expect(initialProps.updateNextViewRangeTime).not.toHaveBeenCalled();
    expect(initialProps.updateViewRangeTime).not.toHaveBeenCalled();
    expect(nextProps.updateNextViewRangeTime).toHaveBeenLastCalledWith({ shiftStart: 0.5 });
    expect(nextProps.updateViewRangeTime).toHaveBeenLastCalledWith(0.5, 0.8, 'minimap');
  });

  it('uses the latest update callback when resetting the zoom', () => {
    const initialProps = makeProps({ viewRange: getViewRange(0.1, 0.9) });
    const { container, rerender } = render(<ViewingLayer {...initialProps} />);
    const nextProps = makeProps({ viewRange: getViewRange(0.2, 0.8) });

    rerender(<ViewingLayer {...nextProps} />);
    fireEvent.click(container.querySelector('.ViewingLayer--resetZoom'));

    expect(initialProps.updateViewRangeTime).not.toHaveBeenCalled();
    expect(nextProps.updateViewRangeTime).toHaveBeenLastCalledWith(0, 1);
  });

  it('commits only on release and keeps the cursor guide hidden during a scrubber drag', () => {
    const props = makeProps({
      viewRange: { time: { current: [0.1, 0.9], cursor: 0.5 } },
    });
    const { container } = render(<ViewingLayer {...props} />);
    const startScrubber = container.querySelectorAll('[data-testid="scrubber"]')[0];

    fireEvent.mouseEnter(startScrubber);
    fireEvent.mouseDown(startScrubber, { button: 0, clientX: 20 });
    fireEvent.mouseMove(window, { button: 0, clientX: 60 });
    fireEvent.mouseLeave(startScrubber, { clientX: 60 });

    expect(props.updateViewRangeTime).not.toHaveBeenCalled();
    expect(container.querySelector('.ViewingLayer--cursorGuide')).not.toBeInTheDocument();

    fireEvent.mouseUp(window, { button: 0, clientX: 60 });
    expect(props.updateViewRangeTime).toHaveBeenLastCalledWith(0.5, 0.9, 'minimap');
    expect(container.querySelector('.ViewingLayer--cursorGuide')).toHaveAttribute('x1', '50%');
  });
});
