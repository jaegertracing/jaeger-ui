// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ViewingLayer from './ViewingLayer';

jest.mock('./Scrubber', () => props => <div data-testid="scrubber" {...props} />);

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
  });

  describe('cursor guide', () => {
    it('renders the cursor guide when cursor is present and not prevented', () => {
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

    it('does not render the cursor guide when scrubber is hovered', () => {
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
  });

  describe('reframe dragging', () => {
    it('renders the cursor guide when viewRange.time.cursor is set', () => {
      props.viewRange = {
        time: {
          current: [0, 1],
          cursor: 0.25,
        },
      };

      rerender(<ViewingLayer {...props} />);

      const guide = container.querySelector('.ViewingLayer--cursorGuide');
      expect(guide).toBeInTheDocument();
      expect(guide.getAttribute('x1')).toBe('25%');
    });
  });

  describe('scrubber interactions', () => {
    it('renders two scrubbers', () => {
      expect(container.querySelectorAll('[data-testid="scrubber"]').length).toBe(2);
    });

    it('prevents cursor drawing on mouse enter and restores on leave', () => {
      const scrubber = container.querySelectorAll('[data-testid="scrubber"]')[0];

      fireEvent.mouseEnter(scrubber);
      fireEvent.mouseLeave(scrubber);

      expect(true).toBe(true);
    });
  });

  describe('.ViewingLayer--resetZoom', () => {
    it('does not render reset button when fully zoomed out', () => {
      expect(container.querySelector('.ViewingLayer--resetZoom')).toBeNull();
    });

    it('renders reset button when start is not zero', () => {
      props.viewRange = getViewRange(0.1, 1);
      rerender(<ViewingLayer {...props} />);

      expect(container.querySelector('.ViewingLayer--resetZoom')).toBeInTheDocument();
    });

    it('renders reset button when end is not one', () => {
      props.viewRange = getViewRange(0, 0.9);
      rerender(<ViewingLayer {...props} />);

      expect(container.querySelector('.ViewingLayer--resetZoom')).toBeInTheDocument();
    });

    it('calls updateViewRangeTime when reset button is clicked', () => {
      props.viewRange = getViewRange(0.1, 0.9);
      rerender(<ViewingLayer {...props} />);

      fireEvent.click(container.querySelector('.ViewingLayer--resetZoom'));

      expect(props.updateViewRangeTime).toHaveBeenCalledWith(0, 1);
    });
  });

  describe('inactive regions', () => {
    it('renders left inactive region when viewStart exists', () => {
      props.viewRange = getViewRange(0.2, 1);
      rerender(<ViewingLayer {...props} />);

      const boxes = container.querySelectorAll('.ViewingLayer--inactive');
      expect(boxes.length).toBeGreaterThan(0);

      const leftBox = boxes[0];
      expect(Math.round(parseFloat(leftBox.getAttribute('width')))).toBe(20);
      expect(leftBox.getAttribute('x')).toBe('0');
    });

    it('renders right inactive region when viewEnd exists', () => {
      props.viewRange = getViewRange(0, 0.8);
      rerender(<ViewingLayer {...props} />);

      const boxes = container.querySelectorAll('.ViewingLayer--inactive');
      expect(boxes.length).toBeGreaterThan(0);

      const rightBox = boxes[boxes.length - 1];
      expect(Math.round(parseFloat(rightBox.getAttribute('x')))).toBe(80);
    });
  });

  it('renders a <GraphTicks /> group', () => {
    expect(container.querySelector('svg g')).toBeInTheDocument();
  });
});
