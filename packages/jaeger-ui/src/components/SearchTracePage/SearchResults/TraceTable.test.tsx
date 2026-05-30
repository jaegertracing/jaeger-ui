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

  it('toggles comparison when the compare cell is clicked', () => {
    const toggleComparison = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <TraceTable {...defaultProps} disableComparisons={false} toggleComparison={toggleComparison} />
      </MemoryRouter>
    );
    // Click the <td> — the whole cell triggers the toggle, not just the checkbox input
    const firstCell = container.querySelector('tbody tr td')!;
    fireEvent.click(firstCell);
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

  it('flips sort direction instead of deactivating when AntD fires cancel', () => {
    const handleSortChange = vi.fn();
    // Start with descend on spans (MOST_SPANS).
    // Clicking the active column triggers AntD's cancel event (order=undefined,
    // columnKey=undefined). Our onChange handler intercepts this and flips
    // descend→ascend, producing LEAST_SPANS instead of falling back to MOST_RECENT.
    render(
      <MemoryRouter>
        <TraceTable {...defaultProps} sortBy={orderBy.MOST_SPANS} handleSortChange={handleSortChange} />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText('Spans'));
    expect(handleSortChange).toHaveBeenCalledWith(orderBy.LEAST_SPANS);
  });
});

describe('toOrderBy', () => {
  it('maps traceName+ascend to TRACE_NAME_ASC', () => {
    expect(toOrderBy('traceName', 'ascend')).toBe(orderBy.TRACE_NAME_ASC);
  });

  it('maps traceName+descend to TRACE_NAME_DESC', () => {
    expect(toOrderBy('traceName', 'descend')).toBe(orderBy.TRACE_NAME_DESC);
  });

  it('maps spans+descend to MOST_SPANS', () => {
    expect(toOrderBy('spans', 'descend')).toBe(orderBy.MOST_SPANS);
  });

  it('maps spans+ascend to LEAST_SPANS', () => {
    expect(toOrderBy('spans', 'ascend')).toBe(orderBy.LEAST_SPANS);
  });

  it('maps errors+descend to MOST_ERRORS', () => {
    expect(toOrderBy('errors', 'descend')).toBe(orderBy.MOST_ERRORS);
  });

  it('maps errors+ascend to LEAST_ERRORS', () => {
    expect(toOrderBy('errors', 'ascend')).toBe(orderBy.LEAST_ERRORS);
  });

  it('maps duration+descend to LONGEST_FIRST', () => {
    expect(toOrderBy('duration', 'descend')).toBe(orderBy.LONGEST_FIRST);
  });

  it('maps duration+ascend to SHORTEST_FIRST', () => {
    expect(toOrderBy('duration', 'ascend')).toBe(orderBy.SHORTEST_FIRST);
  });

  it('maps startTime+descend to MOST_RECENT', () => {
    expect(toOrderBy('startTime', 'descend')).toBe(orderBy.MOST_RECENT);
  });

  it('maps startTime+ascend to OLDEST_FIRST', () => {
    expect(toOrderBy('startTime', 'ascend')).toBe(orderBy.OLDEST_FIRST);
  });

  it('returns MOST_RECENT when order is cleared', () => {
    expect(toOrderBy('spans', undefined)).toBe(orderBy.MOST_RECENT);
    expect(toOrderBy('duration', undefined)).toBe(orderBy.MOST_RECENT);
    expect(toOrderBy(undefined, undefined)).toBe(orderBy.MOST_RECENT);
  });
});

describe('fromOrderBy', () => {
  it('maps TRACE_NAME_ASC to traceName+ascend', () => {
    expect(fromOrderBy(orderBy.TRACE_NAME_ASC)).toEqual({ key: 'traceName', order: 'ascend' });
  });

  it('maps TRACE_NAME_DESC to traceName+descend', () => {
    expect(fromOrderBy(orderBy.TRACE_NAME_DESC)).toEqual({ key: 'traceName', order: 'descend' });
  });

  it('maps MOST_SPANS to spans+descend', () => {
    expect(fromOrderBy(orderBy.MOST_SPANS)).toEqual({ key: 'spans', order: 'descend' });
  });

  it('maps LEAST_SPANS to spans+ascend', () => {
    expect(fromOrderBy(orderBy.LEAST_SPANS)).toEqual({ key: 'spans', order: 'ascend' });
  });

  it('maps MOST_ERRORS to errors+descend', () => {
    expect(fromOrderBy(orderBy.MOST_ERRORS)).toEqual({ key: 'errors', order: 'descend' });
  });

  it('maps LEAST_ERRORS to errors+ascend', () => {
    expect(fromOrderBy(orderBy.LEAST_ERRORS)).toEqual({ key: 'errors', order: 'ascend' });
  });

  it('maps LONGEST_FIRST to duration+descend', () => {
    expect(fromOrderBy(orderBy.LONGEST_FIRST)).toEqual({ key: 'duration', order: 'descend' });
  });

  it('maps SHORTEST_FIRST to duration+ascend', () => {
    expect(fromOrderBy(orderBy.SHORTEST_FIRST)).toEqual({ key: 'duration', order: 'ascend' });
  });

  it('maps OLDEST_FIRST to startTime+ascend', () => {
    expect(fromOrderBy(orderBy.OLDEST_FIRST)).toEqual({ key: 'startTime', order: 'ascend' });
  });

  it('maps MOST_RECENT to startTime+descend', () => {
    expect(fromOrderBy(orderBy.MOST_RECENT)).toEqual({ key: 'startTime', order: 'descend' });
  });
});

describe('column suppression for unsupported backends', () => {
  const makeUnsupportedTrace = (id: string) => ({
    traceID: id,
    traceName: `Trace ${id}`,
    rootServiceName: 'svc',
    rootOperationName: 'op',
    startTime: FIXED_START_TIME,
    duration: 1000 as Microseconds,
    spanCount: 10,
    errorSpanCount: undefined,
    orphanSpanCount: undefined,
    services: [],
  });

  it('hides the Errors column when all summaries have undefined errorSpanCount', () => {
    const traces = [makeUnsupportedTrace('u1'), makeUnsupportedTrace('u2')];
    render(
      <MemoryRouter>
        <TraceTable {...defaultProps} traceSummaries={traces} />
      </MemoryRouter>
    );
    expect(screen.queryByText('Errors')).not.toBeInTheDocument();
  });

  it('hides the Services column when all summaries have empty services', () => {
    const traces = [makeUnsupportedTrace('u1'), makeUnsupportedTrace('u2')];
    render(
      <MemoryRouter>
        <TraceTable {...defaultProps} traceSummaries={traces} />
      </MemoryRouter>
    );
    expect(screen.queryByText('Services')).not.toBeInTheDocument();
  });

  it('shows the Errors column and renders - for unsupported rows in mixed results', () => {
    const supported = makeTrace('s1', 2);
    const unsupported = makeUnsupportedTrace('u1');
    render(
      <MemoryRouter>
        <TraceTable {...defaultProps} traceSummaries={[supported, unsupported]} />
      </MemoryRouter>
    );
    expect(screen.getByText('Errors')).toBeInTheDocument();
    const rows = document.querySelectorAll('tbody tr');
    const unsupportedRow = Array.from(rows).find(r => r.textContent?.includes('Trace u1'));
    expect(unsupportedRow).toBeTruthy();
    // Find the Errors column index from the header, then check same index in the data row
    const headers = Array.from(document.querySelectorAll('thead th'));
    const errorsIndex = headers.findIndex(h => h.textContent?.includes('Errors'));
    expect(errorsIndex).toBeGreaterThan(-1);
    const cells = unsupportedRow!.querySelectorAll('td');
    expect(cells[errorsIndex].textContent).toBe('-');
  });

  it('shows both columns when at least one summary has services and errorSpanCount', () => {
    const supported = makeTrace('s1', 0);
    const unsupported = makeUnsupportedTrace('u1');
    render(
      <MemoryRouter>
        <TraceTable {...defaultProps} traceSummaries={[supported, unsupported]} />
      </MemoryRouter>
    );
    expect(screen.getByText('Services')).toBeInTheDocument();
    expect(screen.getByText('Errors')).toBeInTheDocument();
  });
});
