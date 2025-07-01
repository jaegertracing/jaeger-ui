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
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import TimelineHeaderRow from './TimelineHeaderRow';

jest.mock('../TimelineRow', () => {
  const TimelineRowMock = ({ children, className }) => (
    <div className={className || 'TimelineRow'}>{children}</div>
  );
  TimelineRowMock.Cell = ({ width, children, className }) => (
    <div className={`TimelineRow--cellMock ${className || ''}`} data-width={width}>
      {children}
    </div>
  );
  return {
    __esModule: true,
    default: TimelineRowMock,
  };
});

jest.mock('../../../common/VerticalResizer', () => ({
  __esModule: true,
  default: ({ position, min, max }) => (
    <div data-testid="vertical-resizer" data-position={position} data-min={min} data-max={max} />
  ),
}));

jest.mock('./TimelineViewingLayer', () => ({
  __esModule: true,
  default: ({ boundsInvalidator, viewRangeTime }) => (
    <div
      data-testid="timeline-viewing-layer"
      data-bounds-invalidator={boundsInvalidator}
      data-view-range-time={JSON.stringify(viewRangeTime)}
    />
  ),
}));

jest.mock('../Ticks', () => ({
  __esModule: true,
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

jest.mock('./TimelineCollapser', () => ({
  __esModule: true,
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
    onExpandAll: jest.fn(),
    onExpandOne: jest.fn(),
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

  it('renders the TimelineCollapser', () => {
    render(<TimelineHeaderRow {...props} />);
    expect(screen.getByTestId('timeline-collapser')).toBeInTheDocument();
  });
});
