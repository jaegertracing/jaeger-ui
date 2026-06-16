// Copyright (c) 2022 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TraceFlamegraph from './index';
import testTrace from './testTrace.json';
import transformTraceData from '../../../model/transform-trace-data';

const mockChart = {
  width: vi.fn().mockReturnThis(),
  cellHeight: vi.fn().mockReturnThis(),
  inverted: vi.fn().mockReturnThis(),
  sort: vi.fn().mockReturnThis(),
  setColorMapper: vi.fn().mockReturnThis(),
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
  it('renders the flamegraph wrapper', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    expect(screen.getByTestId('flamegraph-wrapper')).toBeInTheDocument();
  });

  it('renders empty state when trace is null', () => {
    render(<TraceFlamegraph trace={null} />);
    expect(screen.getByTestId('flamegraph-empty')).toBeInTheDocument();
    expect(screen.getByTestId('flamegraph-empty')).toHaveTextContent('No data');
  });

  it('renders empty state when trace is not an OtelTraceFacade', () => {
    render(<TraceFlamegraph trace={{}} />);
    expect(screen.getByTestId('flamegraph-empty')).toBeInTheDocument();
  });

  it('calls d3-flame-graph with correct options when trace is provided', () => {
    render(<TraceFlamegraph trace={otelTrace} />);
    expect(mockChart.inverted).toHaveBeenCalledWith(true);
    expect(mockChart.sort).toHaveBeenCalledWith(false);
    expect(mockChart.cellHeight).toHaveBeenCalledWith(20);
  });
});
