// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import TimelineHeaderRow from './TimelineHeaderRow';
import { SIDE_PANEL_WIDTH_MAX, SIDE_PANEL_WIDTH_MIN } from '../store.constants';

const { RESIZER_DRAG_DELTA } = vi.hoisted(() => ({
  RESIZER_DRAG_DELTA: 0.05,
}));

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

vi.mock('../../../common/VerticalResizer', () => ({
  default: ({ position, min, max, onChange }) => {
    const nextPosition = position - RESIZER_DRAG_DELTA;
    return (
      <button
        type="button"
        data-testid="vertical-resizer"
        data-position={position}
        data-next-position={nextPosition}
        data-min={min}
        data-max={max}
        onClick={() => onChange(nextPosition)}
      />
    );
  },
}));

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
    onColumnWidthChange: jest.fn(),
    onSidePanelWidthChange: jest.fn(),
    onExpandAll: jest.fn(),
    onExpandOne: jest.fn(),
    resizerMax: 0.85,
    sidePanelResizerMin: 0.3,
    sidePanelResizerMax: 0.8,
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
    expect(resizer).toHaveAttribute('data-position', nameColumnWidth.toString());
    expect(resizer).toHaveAttribute('data-min', '0.15');
    expect(resizer).toHaveAttribute('data-max', '0.85');
  });

  describe('side panel visible', () => {
    const sidePanelWidth = 1 - SIDE_PANEL_WIDTH_MAX;
    const sidePanelResizerMin = 1 - SIDE_PANEL_WIDTH_MAX;
    const sidePanelResizerMax = 1 - SIDE_PANEL_WIDTH_MIN;
    const sidePanelProps = {
      ...props,
      sidePanelVisible: true,
      sidePanelWidth,
      sidePanelLabel: 'Span Details',
      resizerMax: 1 - sidePanelWidth,
      sidePanelResizerMin,
      sidePanelResizerMax,
    };

    it('renders the side panel header cell', () => {
      render(<TimelineHeaderRow {...sidePanelProps} />);
      expect(screen.getByText('Span Details')).toBeInTheDocument();
    });

    it('renders a custom side panel label when provided', () => {
      render(<TimelineHeaderRow {...sidePanelProps} sidePanelLabel="Trace Root" />);
      expect(screen.getByText('Trace Root')).toBeInTheDocument();
    });

    it('passes resizerMax through to the name-column resizer', () => {
      const resizerMax = 0.42;
      render(<TimelineHeaderRow {...sidePanelProps} resizerMax={resizerMax} />);
      const [nameColumnResizer] = screen.getAllByTestId('vertical-resizer');

      expect(nameColumnResizer).toHaveAttribute('data-max', String(resizerMax));
    });

    it('renders a side panel resizer aligned with the side panel boundary', () => {
      render(<TimelineHeaderRow {...sidePanelProps} />);
      const [, sidePanelResizer] = screen.getAllByTestId('vertical-resizer');

      expect(sidePanelResizer).toHaveAttribute('data-position', String(1 - sidePanelWidth));
      expect(sidePanelResizer).toHaveAttribute(
        'data-next-position',
        String(1 - sidePanelWidth - RESIZER_DRAG_DELTA)
      );
      expect(sidePanelResizer).toHaveAttribute('data-min', String(sidePanelResizerMin));
      expect(sidePanelResizer).toHaveAttribute('data-max', String(sidePanelResizerMax));
    });

    it('calls the side panel width handler from the side panel resizer', () => {
      const onSidePanelWidthChange = jest.fn();
      render(<TimelineHeaderRow {...sidePanelProps} onSidePanelWidthChange={onSidePanelWidthChange} />);
      const [, sidePanelResizer] = screen.getAllByTestId('vertical-resizer');

      fireEvent.click(sidePanelResizer);

      expect(onSidePanelWidthChange).toHaveBeenCalledTimes(1);
      expect(onSidePanelWidthChange.mock.calls[0][0]).toBeCloseTo(sidePanelWidth + RESIZER_DRAG_DELTA);
    });
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

    it('does not render the VerticalResizer', () => {
      render(<TimelineHeaderRow {...barsHiddenProps} />);
      expect(screen.queryByTestId('vertical-resizer')).not.toBeInTheDocument();
    });

    it('renders the name column at full width', () => {
      const { container } = render(<TimelineHeaderRow {...barsHiddenProps} />);
      const cells = container.querySelectorAll('.TimelineRow--cellMock');
      expect(cells).toHaveLength(1);
      expect(cells[0]).toHaveAttribute('data-width', '1');
    });
  });
});
