// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TraceTable from './TraceTable';

const makeTrace = (id: string, errorCount = 0) => ({
  traceID: id,
  traceName: `Trace ${id}`,
  duration: 1000,
  startTime: Date.now() * 1000,
  spans: [
    ...Array(3).fill({ status: { code: 'OK' } }),
    ...Array(errorCount).fill({ status: { code: 'ERROR' } }),
  ],
  services: [{ name: 'service-a' }],
  hasErrors: () => errorCount > 0,
});

const mockTraces = [makeTrace('a'), makeTrace('b'), makeTrace('c'), makeTrace('d', 2), makeTrace('e')];

const defaultProps = {
  traces: mockTraces as any,
  maxTraceDuration: 5000,
  onRowClick: jest.fn(),
  sortBy: 'MOST_RECENT',
  handleSortChange: jest.fn(),
};

describe('TraceTable', () => {
  it('renders correct row count for a 5-trace fixture', () => {
    render(
      <MemoryRouter>
        <TraceTable {...defaultProps} />
      </MemoryRouter>
    );
    const rows = screen.getAllByText(/Trace [a-e]/);
    expect(rows).toHaveLength(5);
  });

  it('shows correct error count for traces with errored spans', () => {
    render(
      <MemoryRouter>
        <TraceTable {...defaultProps} />
      </MemoryRouter>
    );
    // trace 'd' has 2 errors
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('calls onRowClick when a row is clicked', () => {
    const onRowClick = jest.fn();
    render(
      <MemoryRouter>
        <TraceTable {...defaultProps} onRowClick={onRowClick} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('Trace a'));
    expect(onRowClick).toHaveBeenCalledWith('a');
  });
});
