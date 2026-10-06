// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import DiffSelection from './DiffSelection';
import type { TraceSummary } from '../../../types/trace-summary';
import type { Microseconds } from '../../../types/units';

describe('DiffSelection', () => {
  const mockToggleComparison = vi.fn();
  const mockOnClearAll = vi.fn();

  const traces: TraceSummary[] = [
    {
      traceID: 'trace-id-0',
      duration: 100 as Microseconds,
      traceName: 'trace-name-0',
      rootServiceName: 'svc-0',
      rootOperationName: 'op-0',
      services: [],
      startTime: 0 as Microseconds,
      spanCount: 1,
      errorSpanCount: 0,
      orphanSpanCount: 0,
    },
    {
      traceID: 'trace-id-1',
      duration: 200 as Microseconds,
      traceName: 'trace-name-1',
      rootServiceName: 'svc-1',
      rootOperationName: 'op-1',
      services: [],
      startTime: 0 as Microseconds,
      spanCount: 2,
      errorSpanCount: 0,
      orphanSpanCount: 0,
    },
    {
      traceID: 'trace-id-2',
      duration: 300 as Microseconds,
      traceName: 'trace-name-2',
      rootServiceName: 'svc-2',
      rootOperationName: 'op-2',
      services: [],
      startTime: 0 as Microseconds,
      spanCount: 3,
      errorSpanCount: 0,
      orphanSpanCount: 0,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a trace as expected', () => {
    render(
      <MemoryRouter>
        <DiffSelection traces={traces.slice(0, 1)} toggleComparison={mockToggleComparison} />
      </MemoryRouter>
    );

    expect(screen.getByText('1 Selected for comparison')).toBeInTheDocument();
    expect(screen.getByText('Compare Traces')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '1 Selected for comparison' })).toBeInTheDocument();
    expect(screen.getByTestId('traceName')).toHaveTextContent('trace-name-0');
    expect(screen.getByRole('button', { name: /Deselect All/i })).toBeInTheDocument();
  });

  it('renders multiple traces as expected', () => {
    render(
      <MemoryRouter>
        <DiffSelection traces={traces} toggleComparison={mockToggleComparison} />
      </MemoryRouter>
    );

    const traceNames = screen.getAllByTestId('traceName');
    expect(traceNames).toHaveLength(3);
    expect(traceNames[0]).toHaveTextContent('trace-name-0');
    expect(traceNames[1]).toHaveTextContent('trace-name-1');
    expect(traceNames[2]).toHaveTextContent('trace-name-2');

    expect(screen.getByText('3 Selected for comparison')).toBeInTheDocument();
    expect(screen.getByText('Compare Traces')).toBeInTheDocument();

    const compareLink = screen.getByRole('link', { name: /Compare Traces/i });
    expect(compareLink).toHaveAttribute(
      'href',
      '/trace/trace-id-0...trace-id-1?cohort=trace-id-0&cohort=trace-id-1&cohort=trace-id-2'
    );
  });

  it('renders CTA_MESSAGE when given empty traces array', () => {
    render(
      <MemoryRouter>
        <DiffSelection traces={[]} toggleComparison={mockToggleComparison} />
      </MemoryRouter>
    );

    expect(screen.getByText('Compare traces by selecting result items')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Deselect All/i })).not.toBeInTheDocument();
  });

  it('disables Compare Traces button when cohort length is less than 2', () => {
    render(
      <MemoryRouter>
        <DiffSelection traces={[traces[0]]} toggleComparison={mockToggleComparison} />
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /Compare Traces/i });
    expect(button).toBeDisabled();
    expect(screen.queryByRole('link', { name: /Compare Traces/i })).not.toBeInTheDocument();
  });

  it('enables Compare Traces button when cohort length is 2 or more', () => {
    render(
      <MemoryRouter>
        <DiffSelection traces={traces} toggleComparison={mockToggleComparison} />
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /Compare Traces/i });
    expect(button).toBeEnabled();
  });

  it('calls onClearAll when Deselect All button is clicked', () => {
    render(
      <MemoryRouter>
        <DiffSelection traces={traces} toggleComparison={mockToggleComparison} onClearAll={mockOnClearAll} />
      </MemoryRouter>
    );

    const clearButton = screen.getByRole('button', { name: /Deselect All/i });
    fireEvent.click(clearButton);

    expect(mockOnClearAll).toHaveBeenCalledTimes(1);
  });

  it('hides selected item cards when hideSelectedItems is true', () => {
    render(
      <MemoryRouter>
        <DiffSelection traces={traces} hideSelectedItems toggleComparison={mockToggleComparison} />
      </MemoryRouter>
    );

    expect(screen.queryByTestId('traceName')).not.toBeInTheDocument();
    expect(screen.getByText('3 Selected for comparison')).toBeInTheDocument();
  });

  it('invokes toggleComparison when an item checkbox is toggled', () => {
    render(
      <MemoryRouter>
        <DiffSelection traces={traces.slice(0, 1)} toggleComparison={mockToggleComparison} />
      </MemoryRouter>
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
    fireEvent.click(checkboxes[0]);

    expect(mockToggleComparison).toHaveBeenCalledWith('trace-id-0', true);
  });
});
