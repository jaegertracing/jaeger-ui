// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from 'react';
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

  it('should render the component without errors', () => {
    const { container } = render(<TimelineViewingLayer {...props} />);
    expect(container.querySelector('.TimelineViewingLayer')).toBeInTheDocument();
  });

  it('should assign ref correctly to the root DOM node', () => {
    const { container } = render(<TimelineViewingLayer {...props} />);
    const timelineLayer = container.querySelector('.TimelineViewingLayer');
    expect(timelineLayer).toBeDefined();
  });

  it('should throw an error if getDraggingBounds is called while unmounted', () => {
    const comp = new TimelineViewingLayer(props);
    comp._root = { current: null };
    expect(() => comp._getDraggingBounds()).toThrow(
      'Component must be mounted in order to determine DraggableBounds'
    );
  });

  describe('DraggableManager integration', () => {
    it('should initialize drag handlers on the root element', () => {
      const { container } = render(<TimelineViewingLayer {...props} />);
      const timelineLayer = container.querySelector('.TimelineViewingLayer');
      expect(timelineLayer).toHaveAttribute('aria-hidden');
      expect(timelineLayer.onmousedown).toBeDefined();
      expect(timelineLayer.onmouseleave).toBeDefined();
      expect(timelineLayer.onmousemove).toBeDefined();
    });

    it('should update cursor on mouse move within bounds', () => {
      const { container } = render(<TimelineViewingLayer {...props} />);
      const timelineLayer = container.querySelector('.TimelineViewingLayer');
      fireEvent.mouseMove(timelineLayer, { clientX: 60 });

      expect(props.updateNextViewRangeTime).toHaveBeenCalledWith({
        cursor: expect.any(Number),
      });
    });

    it('should reset cursor when mouse leaves the element', () => {
      const { container } = render(<TimelineViewingLayer {...props} />);
      const timelineLayer = container.querySelector('.TimelineViewingLayer');
      fireEvent.mouseLeave(timelineLayer);

      expect(props.updateNextViewRangeTime).toHaveBeenCalledWith({ cursor: undefined });
    });

    it('should call updateNextViewRangeTime on drag start with anchor and shift', () => {
      const { container } = render(<TimelineViewingLayer {...props} />);
      const timelineLayer = container.querySelector('.TimelineViewingLayer');
      fireEvent.mouseDown(timelineLayer, { clientX: 60 });

      expect(props.updateNextViewRangeTime).toHaveBeenCalledWith({
        reframe: {
          anchor: expect.any(Number),
          shift: expect.any(Number),
        },
      });
    });

    it('should call updateNextViewRangeTime on drag move with new reframe values', () => {
      const anchor = 0.25;
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor, shift: 0.5 } };

      const { container: newContainer } = render(
        <TimelineViewingLayer {...props} viewRangeTime={viewRangeTime} />
      );
      const timelineLayer = newContainer.querySelector('.TimelineViewingLayer');
      fireEvent.mouseDown(timelineLayer, { clientX: 60 });

      expect(props.updateNextViewRangeTime).toHaveBeenCalledWith({
        reframe: {
          anchor: expect.any(Number),
          shift: expect.any(Number),
        },
      });
    });

    it('should call updateViewRangeTime on drag end with sorted values', () => {
      const anchor = 0.75;
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor, shift: 0.5 } };

      const { container: newContainer } = render(
        <TimelineViewingLayer {...props} viewRangeTime={viewRangeTime} />
      );
      const timelineLayer = newContainer.querySelector('.TimelineViewingLayer');
      fireEvent.mouseDown(timelineLayer, { clientX: 60 });
      fireEvent.mouseUp(timelineLayer, { clientX: 40 });

      const [start, end, source] = props.updateViewRangeTime.mock.calls.at(-1);
      expect(start).toBeLessThanOrEqual(end);
      expect(source).toBe('timeline-header');
    });

    it('should reset bounds if boundsInvalidator prop changes', () => {
      const { container, rerender } = render(<TimelineViewingLayer {...props} />);
      rerender(<TimelineViewingLayer {...props} boundsInvalidator="updated" />);
      expect(container.querySelector('.TimelineViewingLayer')).toBeInTheDocument();
    });
  });

  describe('Rendering cursor and drag markers', () => {
    it('should render cursor guide when only cursor is set', () => {
      const cursor = mapFromSubRange(viewStart, viewEnd, 0.5);
      const baseViewRangeTime = { ...props.viewRangeTime, cursor };

      const { container } = render(<TimelineViewingLayer {...props} viewRangeTime={baseViewRangeTime} />);
      const cursorGuide = container.querySelector('.TimelineViewingLayer--cursorGuide');
      expect(cursorGuide).toBeInTheDocument();
    });

    it('should not show cursor if any drag props are set', () => {
      const cursor = mapFromSubRange(viewStart, viewEnd, 0.5);
      const base = { ...props.viewRangeTime, cursor };

      const cases = [
        { ...base, shiftStart: cursor },
        { ...base, shiftEnd: cursor },
        { ...base, reframe: { anchor: cursor, shift: cursor } },
      ];

      cases.forEach(viewRangeTime => {
        const { container } = render(<TimelineViewingLayer {...props} viewRangeTime={viewRangeTime} />);
        const cursorGuide = container.querySelector('.TimelineViewingLayer--cursorGuide');
        expect(cursorGuide).not.toBeInTheDocument();
        cleanup();
      });
    });

    it('should render reframe drag area', () => {
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor: viewStart, shift: viewEnd } };
      const { container } = render(<TimelineViewingLayer {...props} viewRangeTime={viewRangeTime} />);
      expect(container.querySelector('.isDraggingRight.isReframeDrag')).toBeInTheDocument();
    });

    it('should normalize layout when drag range is partially out of bounds', () => {
      const viewRangeTime = {
        ...props.viewRangeTime,
        reframe: { anchor: -0.25, shift: 1.25 },
      };
      const { container } = render(<TimelineViewingLayer {...props} viewRangeTime={viewRangeTime} />);
      const draggedElement = container.querySelector('.TimelineViewingLayer--dragged');
      expect(draggedElement).toBeInTheDocument();
      expect(draggedElement).toHaveStyle({ left: '0%', width: '100%' });
    });

    it('should render shiftStart drag marker', () => {
      const viewRangeTime = { ...props.viewRangeTime, shiftStart: viewEnd };
      const { container } = render(<TimelineViewingLayer {...props} viewRangeTime={viewRangeTime} />);
      expect(container.querySelector('.isDraggingRight.isShiftDrag')).toBeInTheDocument();
    });

    it('should render shiftEnd drag marker', () => {
      const viewRangeTime = { ...props.viewRangeTime, shiftEnd: viewStart };
      const { container } = render(<TimelineViewingLayer {...props} viewRangeTime={viewRangeTime} />);
      expect(container.querySelector('.isDraggingLeft.isShiftDrag')).toBeInTheDocument();
    });

    it('should not render reframe marker if out of view', () => {
      const viewRangeTime = { ...props.viewRangeTime, reframe: { anchor: 1.5, shift: 1.75 } };
      const { container } = render(<TimelineViewingLayer {...props} viewRangeTime={viewRangeTime} />);
      expect(container.querySelector('.isReframeDrag')).not.toBeInTheDocument();
    });
  });
});
