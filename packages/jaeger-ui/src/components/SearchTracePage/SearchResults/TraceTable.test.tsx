// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import TraceTable, { toOrderBy, fromOrderBy } from './TraceTable';
import * as orderBy from '../../../model/order-by';
import type { Microseconds } from '../../../types/units';

const FIXED_START_TIME = 1700000000000000 as Microseconds;

const makeTrace = (id: string, errorSpanCount = 0) => ({
  traceID: id,
  traceName: `Trace ${id}`,
  rootServiceName: 'service-a',
  rootOperationName: 'op-a',
  startTime: FIXED_START_TIME,
  duration: 1000 as Microseconds,
  spanCount: 3,
  errorSpanCount,
  orphanSpanCount: 0,
  services: [{ name: 'service-a', spanCount: 3, errorSpanCount }],
});

const mockTraces = [makeTrace('a'), makeTrace('b'), makeTrace('c'), makeTrace('d', 2), makeTrace('e')];

const defaultProps = {
  traceSummaries: mockTraces,
  maxTraceDuration: 1000 as Microseconds,
  getLink: (traceID: string) => ({ pathname: `/trace/${traceID}` }),
  sortBy: orderBy.MOST_RECENT,
  handleSortChange: vi.fn(),
  disableComparisons: true,
  cohortIds: new Set<string>(),
  toggleComparison: vi.fn(),
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

  it('rows are keyboard-accessible with tabIndex and respond to Enter/Space', () => {
    const { container } = render(
      <MemoryRouter>
        <TraceTable {...defaultProps} />
      </MemoryRouter>
    );
    const firstRow = container.querySelector('tbody tr')!;
    expect(firstRow.getAttribute('tabindex')).toBe('0');
    // Click and keydown should not throw
    fireEvent.click(firstRow.querySelectorAll('td')[1]);
    fireEvent.keyDown(firstRow, { key: 'Enter' });
    fireEvent.keyDown(firstRow, { key: ' ' });
  });

  it('renders comparison checkboxes when comparisons are enabled', () => {
    const toggleComparison = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <TraceTable {...defaultProps} disableComparisons={false} toggleComparison={toggleComparison} />
      </MemoryRouter>
    );
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(mockTraces.length);
  });

  it('does not render comparison checkboxes when comparisons are disabled', () => {
    const { container } = render(
      <MemoryRouter>
        <TraceTable {...defaultProps} disableComparisons={true} />
      </MemoryRouter>
    );
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(0);
  });

  it('toggles comparison on checkbox change', () => {
    const toggleComparison = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <TraceTable {...defaultProps} disableComparisons={false} toggleComparison={toggleComparison} />
      </MemoryRouter>
    );
    const firstCheckbox = container.querySelector('input[type="checkbox"]')!;
    fireEvent.click(firstCheckbox);
    expect(toggleComparison).toHaveBeenCalled();
  });

  it('falls back to traceID when traceName is empty', () => {
    const traces = [{ ...mockTraces[0], traceName: '' }];
    render(
      <MemoryRouter>
        <TraceTable {...defaultProps} traceSummaries={traces} />
      </MemoryRouter>
    );
    expect(screen.getByText(mockTraces[0].traceID)).toBeInTheDocument();
  });

  it('shows error icon in service pill when service has error spans', () => {
    const traces = [makeTrace('x', 3)];
    const { container } = render(
      <MemoryRouter>
        <TraceTable {...defaultProps} traceSummaries={traces} />
      </MemoryRouter>
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
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

  it('calls handleSortChange with MOST_RECENT when Ant Design cancel event fires', () => {
    const handleSortChange = vi.fn();
    render(
      <MemoryRouter>
        <TraceTable {...defaultProps} sortBy={orderBy.MOST_SPANS} handleSortChange={handleSortChange} />
      </MemoryRouter>
    );
    // Ant Design fires the cancel event (order=undefined, columnKey=undefined) when clicking
    // an already-descend-sorted column. Our toggle computes order='ascend', but since
    // columnKey is undefined, toOrderBy falls through to MOST_RECENT.
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

  it('maps startTime+descend to MOST_RECENT (default branch)', () => {
    expect(toOrderBy('startTime', 'descend')).toBe(orderBy.MOST_RECENT);
    expect(toOrderBy('unknown-col', 'descend')).toBe(orderBy.MOST_RECENT);
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
