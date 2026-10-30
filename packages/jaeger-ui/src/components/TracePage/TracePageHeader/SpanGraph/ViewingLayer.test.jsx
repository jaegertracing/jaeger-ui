// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';

import ViewingLayer, { dragTypes } from './ViewingLayer';

vi.mock('./Scrubber', () => mockDefault(props => <div data-testid="scrubber" {...props} />));

function getViewRange(viewStart, viewEnd, time = {}) {
  return { time: { current: [viewStart, viewEnd], ...time } };
}

describe('<ViewingLayer />', () => {
  let props;
  let container;
  let rerender;

  const getGraph = () => container.querySelector('.ViewingLayer--graph');
  const getScrubbers = () => container.querySelectorAll('[data-testid="scrubber"]');

  beforeEach(() => {
    props = {
      height: 60,
      numTicks: 5,
      updateNextViewRangeTime: jest.fn(),
      updateViewRangeTime: jest.fn(),
      viewRange: getViewRange(0, 1),
    };
    vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 10, width: 100 });
    ({ container, rerender } = render(<ViewingLayer {...props} />));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates the cursor and clears it when the pointer leaves the graph', () => {
    const graph = getGraph();

    fireEvent.mouseMove(graph, { clientX: 60 });
    fireEvent.mouseLeave(graph, { clientX: 60 });

    expect(props.updateNextViewRangeTime).toHaveBeenNthCalledWith(1, { cursor: 0.5 });
    expect(props.updateNextViewRangeTime).toHaveBeenNthCalledWith(2, { cursor: null });
  });

  it('reframes the view range through graph drag interactions', () => {
    const graph = getGraph();

    fireEvent.mouseDown(graph, { button: 0, clientX: 40 });
    props.viewRange = getViewRange(0, 1, { reframe: { anchor: 0.3, shift: 0.3 } });
    rerender(<ViewingLayer {...props} />);
    fireEvent.mouseMove(window, { button: 0, clientX: 70 });
    fireEvent.mouseUp(window, { button: 0, clientX: 70 });

    expect(props.updateNextViewRangeTime).toHaveBeenNthCalledWith(1, {
      reframe: { anchor: 0.3, shift: 0.3 },
    });
    expect(props.updateNextViewRangeTime).toHaveBeenNthCalledWith(2, {
      reframe: { anchor: 0.3, shift: 0.6 },
    });
    expect(props.updateViewRangeTime).toHaveBeenCalledWith(0.3, 0.6, 'minimap');
  });

  it('orders endpoints when a reframe drag finishes left of its anchor', () => {
    props.viewRange = getViewRange(0, 1, { reframe: { anchor: 0.75, shift: 0.5 } });
    rerender(<ViewingLayer {...props} />);

    const [shift, edge] = container.querySelectorAll(
      '.ViewingLayer--draggedShift, .ViewingLayer--draggedEdge'
    );
    expect(shift).toHaveAttribute('x', '50%');
    expect(shift).toHaveAttribute('width', '25%');
    expect(edge).toHaveAttribute('x', '50%');

    fireEvent.mouseDown(getGraph(), { button: 0, clientX: 85 });
    fireEvent.mouseUp(window, { button: 0, clientX: 60 });

    expect(props.updateViewRangeTime).toHaveBeenCalledWith(0.5, 0.75, 'minimap');
  });

  it('stops scrubber drag-start propagation before the graph can reframe', () => {
    fireEvent.mouseDown(getScrubbers()[0], { button: 0, clientX: 10 });

    expect(props.updateNextViewRangeTime).toHaveBeenCalledTimes(1);
    expect(props.updateNextViewRangeTime).toHaveBeenCalledWith({ shiftStart: 0 });
  });

  it.each([
    ['start', 0, 20, 110, { shiftStart: 0.9 }, [0.9, 0.9, 'minimap']],
    ['end', 1, 100, 10, { shiftEnd: 0.1 }, [0.1, 0.1, 'minimap']],
  ])(
    'keeps the %s scrubber within a narrowed view range',
    (_, index, startClientX, endClientX, expectedUpdate, expectedRange) => {
      props.viewRange = getViewRange(0.1, 0.9);
      rerender(<ViewingLayer {...props} />);

      fireEvent.mouseDown(getScrubbers()[index], { button: 0, clientX: startClientX });
      fireEvent.mouseMove(window, { button: 0, clientX: endClientX });
      fireEvent.mouseUp(window, { button: 0, clientX: endClientX });

      expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith(expectedUpdate);
      expect(props.updateViewRangeTime).toHaveBeenCalledWith(...expectedRange);
    }
  );

  it('recalculates scrubber bounds after a drag ends', () => {
    props.viewRange = getViewRange(0.1, 0.9);
    rerender(<ViewingLayer {...props} />);

    fireEvent.mouseDown(getScrubbers()[0], { button: 0, clientX: 20 });
    fireEvent.mouseMove(window, { button: 0, clientX: 90 });
    fireEvent.mouseUp(window, { button: 0, clientX: 90 });

    props.viewRange = getViewRange(0.1, 1);
    rerender(<ViewingLayer {...props} />);
    fireEvent.mouseDown(getScrubbers()[0], { button: 0, clientX: 20 });
    fireEvent.mouseMove(window, { button: 0, clientX: 110 });
    fireEvent.mouseUp(window, { button: 0, clientX: 110 });

    expect(props.updateNextViewRangeTime).toHaveBeenLastCalledWith({ shiftStart: 1 });
    expect(props.updateViewRangeTime).toHaveBeenLastCalledWith(1, 1, 'minimap');
  });

  it('restores the cursor guide after a scrubber drag ends', () => {
    props.viewRange = getViewRange(0, 1, { cursor: 0.5 });
    rerender(<ViewingLayer {...props} />);
    const scrubber = getScrubbers()[0];

    expect(container.querySelector('.ViewingLayer--cursorGuide')).toHaveAttribute('x1', '50%');
    fireEvent.mouseEnter(scrubber, { clientX: 10 });
    expect(container.querySelector('.ViewingLayer--cursorGuide')).not.toBeInTheDocument();

    fireEvent.mouseDown(scrubber, { button: 0, clientX: 10 });
    fireEvent.mouseLeave(scrubber, { clientX: 10 });
    expect(container.querySelector('.ViewingLayer--cursorGuide')).not.toBeInTheDocument();
    fireEvent.mouseUp(window, { button: 0, clientX: 10 });

    expect(container.querySelector('.ViewingLayer--cursorGuide')).toHaveAttribute('x1', '50%');
  });

  describe('.ViewingLayer--resetZoom', () => {
    it('does not render when fully zoomed out', () => {
      expect(container.querySelector('.ViewingLayer--resetZoom')).toBeNull();
    });

    it.each([
      [0.1, 1],
      [0, 0.9],
    ])('renders when the range is [%s, %s]', (start, end) => {
      props.viewRange = getViewRange(start, end);
      rerender(<ViewingLayer {...props} />);
      expect(container.querySelector('.ViewingLayer--resetZoom')).toBeInTheDocument();
    });

    it('resets the view range when clicked', () => {
      props.viewRange = getViewRange(0.1, 0.9);
      rerender(<ViewingLayer {...props} />);

      fireEvent.click(container.querySelector('.ViewingLayer--resetZoom'));

      expect(props.updateViewRangeTime).toHaveBeenCalledWith(0, 1);
    });
  });

  it('renders both inactive regions with their correct dimensions', () => {
    props.viewRange = getViewRange(0.2, 0.8);
    rerender(<ViewingLayer {...props} />);

    const [left, right] = container.querySelectorAll('.ViewingLayer--inactive');
    expect(left).toHaveAttribute('x', '0');
    expect(left).toHaveAttribute('width', '20%');
    expect(right).toHaveAttribute('x', '80%');
    expect(right).toHaveAttribute('width', '20%');
  });

  it('renders the cursor guide at the cursor position', () => {
    props.viewRange = getViewRange(0, 1, { cursor: 0.5 });
    rerender(<ViewingLayer {...props} />);

    expect(container.querySelector('.ViewingLayer--cursorGuide')).toHaveAttribute('x1', '50%');
  });

  it('renders graph ticks and two scrubbers', () => {
    expect(container.querySelector('svg g')).toBeInTheDocument();
    expect(getScrubbers()).toHaveLength(2);
  });

  it('exports the drag-manager tags', () => {
    expect(dragTypes).toEqual({
      REFRAME: 'REFRAME',
      SHIFT_END: 'SHIFT_END',
      SHIFT_START: 'SHIFT_START',
    });
  });
});
