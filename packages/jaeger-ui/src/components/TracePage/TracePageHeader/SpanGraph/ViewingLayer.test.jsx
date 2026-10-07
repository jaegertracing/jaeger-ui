// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';

import ViewingLayer from './ViewingLayer';

vi.mock('./Scrubber', () => mockDefault(props => <div data-testid="scrubber" {...props} />));

function getViewRange(viewStart, viewEnd) {
  return { time: { current: [viewStart, viewEnd] } };
}

describe('<ViewingLayer />', () => {
  let props;
  let container;
  let rerender;

  beforeEach(() => {
    props = {
      height: 60,
      numTicks: 5,
      updateNextViewRangeTime: jest.fn(),
      updateViewRangeTime: jest.fn(),
      viewRange: getViewRange(0, 1),
    };
    ({ container, rerender } = render(<ViewingLayer {...props} />));
    vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 10, width: 100 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('updates the cursor and clears it when the pointer leaves the graph', () => {
    const graph = container.querySelector('.ViewingLayer--graph');

    fireEvent.mouseMove(graph, { clientX: 60 });
    fireEvent.mouseLeave(graph, { clientX: 60 });

    expect(props.updateNextViewRangeTime).toHaveBeenNthCalledWith(1, { cursor: 0.5 });
    expect(props.updateNextViewRangeTime).toHaveBeenNthCalledWith(2, { cursor: null });
  });

  it('reframes the view range through graph drag interactions', () => {
    const graph = container.querySelector('.ViewingLayer--graph');

    fireEvent.mouseDown(graph, { button: 0, clientX: 40 });
    props.viewRange = { time: { current: [0, 1], reframe: { anchor: 0.3 } } };
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

  it('uses an existing reframe anchor when completing a graph drag', () => {
    props.viewRange = { time: { current: [0, 1], reframe: { anchor: 0.2 } } };
    rerender(<ViewingLayer {...props} />);

    const graph = container.querySelector('.ViewingLayer--graph');
    fireEvent.mouseDown(graph, { button: 0, clientX: 80 });
    fireEvent.mouseUp(window, { button: 0, clientX: 80 });

    expect(props.updateViewRangeTime).toHaveBeenCalledWith(0.2, 0.7, 'minimap');
  });

  it('hides the cursor guide while a scrubber is hovered and restores it on leave', () => {
    props.viewRange = { time: { current: [0, 1], cursor: 0.5 } };
    rerender(<ViewingLayer {...props} />);
    const scrubber = container.querySelectorAll('[data-testid="scrubber"]')[0];

    expect(container.querySelector('.ViewingLayer--cursorGuide')).toBeInTheDocument();
    fireEvent.mouseEnter(scrubber, { clientX: 10 });
    expect(container.querySelector('.ViewingLayer--cursorGuide')).not.toBeInTheDocument();
    fireEvent.mouseLeave(scrubber, { clientX: 10 });
    expect(container.querySelector('.ViewingLayer--cursorGuide')).toBeInTheDocument();
  });

  it.each([
    ['start', 0, 0.5, { shiftStart: 0.4 }, [0.4, 1, 'minimap']],
    ['end', 1, 0.5, { shiftEnd: 0.4 }, [0, 0.4, 'minimap']],
  ])(
    'updates the %s scrubber through drag interactions',
    (_, index, position, expectedUpdate, expectedRange) => {
      const scrubber = container.querySelectorAll('[data-testid="scrubber"]')[index];

      fireEvent.mouseDown(scrubber, { button: 0, clientX: position * 100 + 10 });
      fireEvent.mouseMove(window, { button: 0, clientX: 50 });
      fireEvent.mouseUp(window, { button: 0, clientX: 50 });

      expect(props.updateNextViewRangeTime).toHaveBeenCalledWith(expectedUpdate);
      expect(props.updateViewRangeTime).toHaveBeenCalledWith(...expectedRange);
    }
  );

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

  it('renders GraphTicks and inactive regions', () => {
    props.viewRange = getViewRange(0.2, 0.8);
    rerender(<ViewingLayer {...props} />);

    expect(container.querySelector('svg g')).toBeInTheDocument();
    const [left, right] = container.querySelectorAll('.ViewingLayer--inactive');
    expect(left).toHaveAttribute('width', '20%');
    expect(right).toHaveAttribute('x', '80%');
  });
});
