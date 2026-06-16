// Copyright (c) 2022 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TraceFlamegraph from './index';
import testTrace from './testTrace.json';
import transformTraceData from '../../../model/transform-trace-data';

const mockChart = {
  width: vi.fn().mockReturnThis(),
  cellHeight: vi.fn().mockReturnThis(),
  inverted: vi.fn().mockReturnThis(),
  sort: vi.fn().mockReturnThis(),
  selfValue: vi.fn().mockReturnThis(),
  transitionDuration: vi.fn().mockReturnThis(),
  onClick: vi.fn().mockReturnThis(),
  setColorMapper: vi.fn().mockReturnThis(),
  setLabelHandler: vi.fn().mockReturnThis(),
  search: vi.fn(),
  clear: vi.fn(),
  resetZoom: vi.fn(),
  destroy: vi.fn(),
};

vi.mock('d3-flame-graph', () => ({
  default: () => mockChart,
}));

vi.mock('d3-selection', () => ({
  select: vi.fn(() => ({
    datum: vi.fn().mockReturnThis(),
    call: vi.fn().mockReturnThis(),
  })),
}));

const otelTrace = transformTraceData(testTrace.data).asOtelTrace();

describe('<TraceFlamegraph />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the flamegraph wrapper', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    expect(screen.getByTestId('flamegraph-wrapper')).toBeInTheDocument();
  });

  it('renders empty state when trace is null', () => {
    render(<TraceFlamegraph trace={null} />);
    expect(screen.getByTestId('flamegraph-empty')).toBeInTheDocument();
  });

  it('renders empty state when trace is not an OtelTraceFacade', () => {
    render(<TraceFlamegraph trace={{}} />);
    expect(screen.getByTestId('flamegraph-empty')).toBeInTheDocument();
  });

  it('renders the toolbar with view mode toggle', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
    expect(screen.getByText('Table')).toBeInTheDocument();
    expect(screen.getByText('Both')).toBeInTheDocument();
    expect(screen.getByText('Flamegraph')).toBeInTheDocument();
  });

  it('renders both table and chart in "both" mode (default)', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByTestId('flamegraph-chart')).toBeInTheDocument();
  });

  it('renders table with correct data', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    expect(screen.getByText('load-generator: OrderVehicle')).toBeInTheDocument();
    expect(screen.getByText('ride-sharing-app: FindNearestVehicle')).toBeInTheDocument();
  });

  it('search input filters table rows', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    const searchInput = screen.getByTestId('flamegraph-search');
    fireEvent.change(searchInput, { target: { value: 'OrderVehicle' } });
    expect(screen.getByText('load-generator: OrderVehicle')).toBeInTheDocument();
    expect(screen.queryByText('ride-sharing-app: FindNearestVehicle')).not.toBeInTheDocument();
  });

  it('reset button is disabled when state is clean', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    expect(screen.getByTestId('flamegraph-reset')).toBeDisabled();
  });

  it('reset button becomes enabled after searching', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    const searchInput = screen.getByTestId('flamegraph-search');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    expect(screen.getByTestId('flamegraph-reset')).not.toBeDisabled();
  });
});
