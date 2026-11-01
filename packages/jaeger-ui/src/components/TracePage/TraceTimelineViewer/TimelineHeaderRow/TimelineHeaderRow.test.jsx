// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import TimelineHeaderRow from './TimelineHeaderRow';

vi.mock('../TimelineRow', () => {
  const TimelineRowMock = ({ children, className }) => (
    <div className={className || 'TimelineRow'}>{children}</div>
  );
  TimelineRowMock.Cell = ({ width, children, className }) => (
    <div className={`TimelineRow--cellMock ${className || ''}`} data-width={width}>
      {children}
    </div>
  );
  return {
    default: TimelineRowMock,
  };
});

vi.mock('./TimelineViewingLayer', () => ({
  default: ({ boundsInvalidator, viewRangeTime }) => (
    <div
      data-testid="timeline-viewing-layer"
      data-bounds-invalidator={boundsInvalidator}
      data-view-range-time={JSON.stringify(viewRangeTime)}
    />
  ),
}));

vi.mock('../Ticks', () => ({
  default: ({ numTicks, startTime, endTime, showLabels }) => (
    <div
      data-testid="ticks"
      data-num-ticks={numTicks}
      data-start-time={startTime}
      data-end-time={endTime}
      data-show-labels={showLabels ? 'true' : 'false'}
    />
  ),
}));

vi.mock('./TimelineCollapser', () => ({
  default: () => <div data-testid="timeline-collapser" />,
}));

describe('<TimelineHeaderRow>', () => {
  const nameColumnWidth = 0.25;
  const props = {
    nameColumnWidth,
    duration: 1234,
    numTicks: 5,
    onCollapseAll: jest.fn(),
    onCollapseOne: jest.fn(),
    onColummWidthChange: jest.fn(),
    onSidePanelWidthChange: jest.fn(),
    onExpandAll: jest.fn(),
    onExpandOne: jest.fn(),
    resizerMax: 0.85,
    timelineBarsVisible: true,
    updateNextViewRangeTime: jest.fn(),
    updateViewRangeTime: jest.fn(),
    viewRangeTime: {
      current: [0.1, 0.9],
    },
  };

  it('renders without exploding', () => {
    const { container } = render(<TimelineHeaderRow {...props} />);
    expect(container.querySelector('.TimelineHeaderRow')).toBeInTheDocument();
  });

  it('propagates the name column width', () => {
    const { container } = render(<TimelineHeaderRow {...props} />);
    const cells = container.querySelectorAll('.TimelineRow--cellMock');

    expect(cells[0]).toHaveAttribute('data-width', nameColumnWidth.toString());
    expect(cells[1]).toHaveAttribute('data-width', (1 - nameColumnWidth).toString());
  });

  it('renders the title', () => {
    render(<TimelineHeaderRow {...props} />);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Service & Operation');
  });

  it('renders "Span Name" in the title when useOtelTerms is true', () => {
    render(<TimelineHeaderRow {...props} useOtelTerms />);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Service & Span Name');
  });

  it('renders the TimelineViewingLayer', () => {
    render(<TimelineHeaderRow {...props} />);
    const viewingLayer = screen.getByTestId('timeline-viewing-layer');

    expect(viewingLayer).toBeInTheDocument();
    expect(viewingLayer).toHaveAttribute('data-bounds-invalidator', nameColumnWidth.toString());
    expect(viewingLayer).toHaveAttribute('data-view-range-time', JSON.stringify(props.viewRangeTime));
  });

  it('renders the Ticks', () => {
    render(<TimelineHeaderRow {...props} />);
    const ticks = screen.getByTestId('ticks');
    const [viewStart, viewEnd] = props.viewRangeTime.current;

    expect(ticks).toBeInTheDocument();
    expect(ticks).toHaveAttribute('data-num-ticks', props.numTicks.toString());
    expect(ticks).toHaveAttribute('data-start-time', (viewStart * props.duration).toString());
    expect(ticks).toHaveAttribute('data-end-time', (viewEnd * props.duration).toString());
    expect(ticks).toHaveAttribute('data-show-labels', 'true');
  });

  it('renders the VerticalResizer', () => {
    render(<TimelineHeaderRow {...props} />);
    const resizer = screen.getByTestId('vertical-resizer');

    expect(resizer).toBeInTheDocument();
    expect(resizer.querySelector('.VerticalResizer--dragger')).toHaveStyle({ left: '25%' });
  });

  describe('side panel visible', () => {
    const sidePanelWidth = 0.3;
    const sidePanelProps = {
      ...props,
      sidePanelVisible: true,
      sidePanelWidth,
      sidePanelLabel: 'Span Details',
      resizerMax: 1 - sidePanelWidth,
    };

    it('renders the side panel header cell', () => {
      render(<TimelineHeaderRow {...sidePanelProps} />);
      expect(screen.getByText('Span Details')).toBeInTheDocument();
    });

    it.each([true, false])('places dividers after the side-panel header with bars visible=%s', visible => {
      const { container } = render(<TimelineHeaderRow {...sidePanelProps} timelineBarsVisible={visible} />);
      const cell = container.querySelector('.TimelineHeaderRow--sidePanelCell');
      for (const resizer of screen.getAllByTestId('vertical-resizer')) {
        expect(cell.compareDocumentPosition(resizer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
    });

    it('renders a custom side panel label when provided', () => {
      render(<TimelineHeaderRow {...sidePanelProps} sidePanelLabel="Trace Root" />);
      expect(screen.getByText('Trace Root')).toBeInTheDocument();
    });

    it.each([0.3, 0.56])('places the side-panel divider on the column boundary at width %s', width => {
      render(<TimelineHeaderRow {...sidePanelProps} sidePanelWidth={width} />);
      const resizers = screen.getAllByTestId('vertical-resizer');
      expect(resizers).toHaveLength(2);
      expect(resizers[0]).not.toHaveClass('is-flipped');
      expect(resizers[1]).not.toHaveClass('is-flipped');
      expect(parseFloat(resizers[1].querySelector('.VerticalResizer--dragger').style.left)).toBeCloseTo(
        (1 - width) * 100
      );
    });

    it('keeps an exact-boundary drag active across a header rerender', () => {
      const onSidePanelWidthChange = vi.fn();
      const { rerender } = render(
        <TimelineHeaderRow {...sidePanelProps} onSidePanelWidthChange={onSidePanelWidthChange} />
      );
      const resizer = screen.getAllByTestId('vertical-resizer')[1];
      resizer.getBoundingClientRect = () => ({ left: 0, width: 1000 });
      const dragger = resizer.querySelector('.VerticalResizer--dragger');
      fireEvent.mouseDown(dragger, { clientX: 700, button: 0 });
      rerender(<TimelineHeaderRow {...sidePanelProps} onSidePanelWidthChange={onSidePanelWidthChange} />);
      fireEvent.mouseMove(window, { clientX: 600 });
      expect(resizer).toHaveClass('isDraggingLeft');
      fireEvent.mouseUp(window, { clientX: 600 });
      expect(onSidePanelWidthChange).toHaveBeenCalledTimes(1);
      expect(onSidePanelWidthChange.mock.calls[0][0]).toBeCloseTo(0.4);
    });

    it.each([
      [0.25, 0.6, 0.4],
      [0.25, 0.1, 0.7],
      [0.4, 0.1, 0.55],
      [0.4, 0.95, 0.2],
    ])(
      'drags with name width %s to boundary %s and commits panel width %s',
      (nameWidth, target, expected) => {
        const onSidePanelWidthChange = vi.fn();
        const { rerender } = render(
          <TimelineHeaderRow
            {...sidePanelProps}
            nameColumnWidth={nameWidth}
            sidePanelWidth={0.3}
            onSidePanelWidthChange={onSidePanelWidthChange}
          />
        );
        const resizer = screen.getAllByTestId('vertical-resizer')[1];
        resizer.getBoundingClientRect = () => ({ left: 120, width: 1000 });
        const dragger = resizer.querySelector('.VerticalResizer--dragger');
        fireEvent.mouseDown(dragger, { clientX: 820, button: 0 });
        fireEvent.mouseMove(window, { clientX: 120 + target * 1000 });
        expect(onSidePanelWidthChange).not.toHaveBeenCalled();
        const boundary = 1 - expected;
        expect(parseFloat(dragger.style.left)).toBeCloseTo(Math.min(0.7, boundary) * 100);
        fireEvent.mouseUp(window, { clientX: 120 + target * 1000 });
        expect(onSidePanelWidthChange).toHaveBeenCalledTimes(1);
        expect(onSidePanelWidthChange.mock.calls[0][0]).toBeCloseTo(expected);
        rerender(
          <TimelineHeaderRow
            {...sidePanelProps}
            nameColumnWidth={nameWidth}
            sidePanelWidth={expected}
            onSidePanelWidthChange={onSidePanelWidthChange}
          />
        );
        expect(parseFloat(dragger.style.left)).toBeCloseTo(boundary * 100);
      }
    );

    it.each([
      [true, 0.3, 0.65],
      [false, 0.75, 0.8],
    ])(
      'keeps name-column dragging active with bars visible=%s',
      (timelineBarsVisible, sidePanelWidth, resizerMax) => {
        const onColummWidthChange = vi.fn();
        render(
          <TimelineHeaderRow
            {...sidePanelProps}
            timelineBarsVisible={timelineBarsVisible}
            sidePanelWidth={sidePanelWidth}
            resizerMax={resizerMax}
            onColummWidthChange={onColummWidthChange}
          />
        );
        const resizer = screen.getAllByTestId('vertical-resizer')[0];
        resizer.getBoundingClientRect = () => ({ left: 120, width: 1000 });
        const dragger = resizer.querySelector('.VerticalResizer--dragger');
        for (const [target, expected] of [
          [0, 0.15],
          [0.4, 0.4],
          [1, resizerMax],
        ]) {
          fireEvent.mouseDown(dragger, { clientX: 370, button: 0 });
          fireEvent.mouseMove(window, { clientX: 120 + target * 1000 });
          fireEvent.mouseUp(window, { clientX: 120 + target * 1000 });
          expect(onColummWidthChange).toHaveBeenLastCalledWith(expected);
        }
      }
    );
  });

  it('renders the TimelineCollapser', () => {
    render(<TimelineHeaderRow {...props} />);
    expect(screen.getByTestId('timeline-collapser')).toBeInTheDocument();
  });

  describe('tree-only mode (timelineBarsVisible=false)', () => {
    // In tree-only mode TraceTimelineViewer passes nameColumnWidth=1 (name fills the main area).
    const barsHiddenProps = { ...props, timelineBarsVisible: false, nameColumnWidth: 1 };

    it('does not render the Ticks', () => {
      render(<TimelineHeaderRow {...barsHiddenProps} />);
      expect(screen.queryByTestId('ticks')).not.toBeInTheDocument();
    });

    it('does not render the TimelineViewingLayer', () => {
      render(<TimelineHeaderRow {...barsHiddenProps} />);
      expect(screen.queryByTestId('timeline-viewing-layer')).not.toBeInTheDocument();
    });

    it('does not render the VerticalResizer when sidePanel is hidden', () => {
      render(<TimelineHeaderRow {...barsHiddenProps} />);
      expect(screen.queryByTestId('vertical-resizer')).not.toBeInTheDocument();
    });

    it('renders the name column at full width', () => {
      const { container } = render(<TimelineHeaderRow {...barsHiddenProps} />);
      const cells = container.querySelectorAll('.TimelineRow--cellMock');
      expect(cells).toHaveLength(1);
      expect(cells[0]).toHaveAttribute('data-width', '1');
    });

    describe('with side panel visible', () => {
      const treeOnlySidePanelProps = {
        ...barsHiddenProps,
        sidePanelVisible: true,
        nameColumnWidth: 0.25,
        sidePanelWidth: 0.75,
        sidePanelLabel: 'Span Details',
        resizerMax: 0.8,
      };

      it('renders only the name-column resizer (the side-panel divider is gated on bars)', () => {
        render(<TimelineHeaderRow {...treeOnlySidePanelProps} />);
        const resizers = screen.getAllByTestId('vertical-resizer');
        expect(resizers).toHaveLength(1);
        expect(resizers[0]).not.toHaveClass('is-flipped');
      });
    });
  });
});
