// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TraceTable, { toOrderBy, fromOrderBy } from './TraceTable';
import * as orderBy from '../../../model/order-by';
import { StatusCode } from '../../../types/otel';

const FIXED_START_TIME = 1700000000000000;

const makeTrace = (id: string, errorCount = 0) => ({
  traceID: id,
  traceName: `Trace ${id}`,
  duration: 1000,
  startTime: FIXED_START_TIME,
  spans: [
    ...Array(3).fill({ status: { code: StatusCode.OK } }),
    ...Array(errorCount).fill({ status: { code: StatusCode.ERROR } }),
  ],
  services: [{ name: 'service-a' }],
  hasErrors: () => errorCount > 0,
});

const mockTraces = [makeTrace('a'), makeTrace('b'), makeTrace('c'), makeTrace('d', 2), makeTrace('e')];

const defaultProps = {
  traces: mockTraces as any,
  onRowClick: vi.fn(),
  sortBy: orderBy.MOST_RECENT,
  handleSortChange: vi.fn(),
};

describe('TraceTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    const { container } = render(
      <MemoryRouter>
        <TraceTable {...defaultProps} />
      </MemoryRouter>
    );
    const rows = container.querySelectorAll('tbody tr');
    const traceD = Array.from(rows).find(r => r.textContent?.includes('Trace d'));
    expect(traceD).toBeTruthy();
    const cells = traceD!.querySelectorAll('td');
    const errorsCell = cells[3];
    expect(within(errorsCell as HTMLElement).getByText('2')).toBeInTheDocument();
  });

  it('calls onRowClick when a row is clicked', () => {
    const onRowClick = vi.fn();
    render(
      <MemoryRouter>
        <TraceTable {...defaultProps} onRowClick={onRowClick} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('Trace a'));
    expect(onRowClick).toHaveBeenCalledWith('a');
  });

  it('calls onRowClick on Enter key for keyboard navigation', () => {
    const onRowClick = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <TraceTable {...defaultProps} onRowClick={onRowClick} />
      </MemoryRouter>
    );
    const firstRow = container.querySelector('tbody tr');
    fireEvent.keyDown(firstRow!, { key: 'Enter' });
    expect(onRowClick).toHaveBeenCalledWith('a');
  });

  it('calls onRowClick on Space key for keyboard navigation', () => {
    const onRowClick = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <TraceTable {...defaultProps} onRowClick={onRowClick} />
      </MemoryRouter>
    );
    const firstRow = container.querySelector('tbody tr');
    fireEvent.keyDown(firstRow!, { key: ' ' });
    expect(onRowClick).toHaveBeenCalledWith('a');
  });
});

describe('sort onChange wiring', () => {
  it('calls handleSortChange when a sortable column header is clicked', () => {
    const handleSortChange = vi.fn();
    render(
      <MemoryRouter>
        <TraceTable {...defaultProps} handleSortChange={handleSortChange} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('Spans'));
    expect(handleSortChange).toHaveBeenCalledWith(orderBy.LEAST_SPANS);
  });

  it('calls handleSortChange with MOST_RECENT when sort is cleared', () => {
    const handleSortChange = vi.fn();
    render(
      <MemoryRouter>
        <TraceTable {...defaultProps} sortBy={orderBy.MOST_SPANS} handleSortChange={handleSortChange} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('Spans'));
    expect(handleSortChange).toHaveBeenCalledWith(orderBy.MOST_RECENT);
  });
});

describe('toOrderBy', () => {
  it('maps spans+descend to MOST_SPANS', () => {
    expect(toOrderBy('spans', 'descend')).toBe(orderBy.MOST_SPANS);
  });

  it('maps spans+ascend to LEAST_SPANS', () => {
    expect(toOrderBy('spans', 'ascend')).toBe(orderBy.LEAST_SPANS);
  });

  it('maps duration+descend to LONGEST_FIRST', () => {
    expect(toOrderBy('duration', 'descend')).toBe(orderBy.LONGEST_FIRST);
  });

  it('maps duration+ascend to SHORTEST_FIRST', () => {
    expect(toOrderBy('duration', 'ascend')).toBe(orderBy.SHORTEST_FIRST);
  });

  it('defaults to MOST_RECENT for unknown column', () => {
    expect(toOrderBy('startTime', 'descend')).toBe(orderBy.MOST_RECENT);
  });

  it('returns MOST_RECENT when order is cleared (3rd click)', () => {
    expect(toOrderBy('spans', undefined)).toBe(orderBy.MOST_RECENT);
    expect(toOrderBy('duration', undefined)).toBe(orderBy.MOST_RECENT);
    expect(toOrderBy(undefined, undefined)).toBe(orderBy.MOST_RECENT);
  });
});

describe('fromOrderBy', () => {
  it('maps MOST_SPANS to spans+descend', () => {
    expect(fromOrderBy(orderBy.MOST_SPANS)).toEqual({ key: 'spans', order: 'descend' });
  });

  it('maps LEAST_SPANS to spans+ascend', () => {
    expect(fromOrderBy(orderBy.LEAST_SPANS)).toEqual({ key: 'spans', order: 'ascend' });
  });

  it('maps LONGEST_FIRST to duration+descend', () => {
    expect(fromOrderBy(orderBy.LONGEST_FIRST)).toEqual({ key: 'duration', order: 'descend' });
  });

  it('maps SHORTEST_FIRST to duration+ascend', () => {
    expect(fromOrderBy(orderBy.SHORTEST_FIRST)).toEqual({ key: 'duration', order: 'ascend' });
  });

  it('maps MOST_RECENT to startTime+descend', () => {
    expect(fromOrderBy(orderBy.MOST_RECENT)).toEqual({ key: 'startTime', order: 'descend' });
  });
});
