// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import ServiceFilter from './index';
import { IOtelTrace, IOtelSpan } from '../../../../types/otel';

function makeTrace(serviceNames: string[]): IOtelTrace {
  const services = serviceNames.map(name => ({ name, numberOfSpans: 3 }));
  const rootSpans = [
    { spanID: 'root-1', resource: { serviceName: serviceNames[0], attributes: [] } } as unknown as IOtelSpan,
  ];
  return {
    services,
    rootSpans,
    spans: [],
  } as unknown as IOtelTrace;
}

describe('ServiceFilter', () => {
  let onApply: (prunedServices: Set<string>) => void;

  beforeEach(() => {
    onApply = vi.fn<(prunedServices: Set<string>) => void>();
  });

  it('renders nothing for single-service traces', () => {
    const { container } = render(
      <ServiceFilter trace={makeTrace(['only-svc'])} prunedServices={new Set()} onApply={onApply} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the filter button for multi-service traces', () => {
    render(
      <ServiceFilter trace={makeTrace(['svc-a', 'svc-b'])} prunedServices={new Set()} onApply={onApply} />
    );
    expect(screen.getByTestId('service-filter-button')).toBeInTheDocument();
  });

  it('shows active style when filter is active', () => {
    render(
      <ServiceFilter
        trace={makeTrace(['svc-a', 'svc-b'])}
        prunedServices={new Set(['svc-b'])}
        onApply={onApply}
      />
    );
    expect(screen.getByTestId('service-filter-button')).toHaveClass('is-active');
  });

  it('shows inactive style when no filter', () => {
    render(
      <ServiceFilter trace={makeTrace(['svc-a', 'svc-b'])} prunedServices={new Set()} onApply={onApply} />
    );
    expect(screen.getByTestId('service-filter-button')).not.toHaveClass('is-active');
  });

  it('opens popover with service list on click', async () => {
    render(
      <ServiceFilter
        trace={makeTrace(['svc-a', 'svc-b', 'svc-c'])}
        prunedServices={new Set()}
        onApply={onApply}
      />
    );
    fireEvent.click(screen.getByTestId('service-filter-button'));
    await waitFor(() => {
      expect(screen.getByText('Filter Services')).toBeInTheDocument();
      expect(screen.getByText('svc-a')).toBeInTheDocument();
      expect(screen.getByText('svc-b')).toBeInTheDocument();
      expect(screen.getByText('svc-c')).toBeInTheDocument();
    });
  });

  it('shows root badge for root service', async () => {
    render(
      <ServiceFilter trace={makeTrace(['svc-a', 'svc-b'])} prunedServices={new Set()} onApply={onApply} />
    );
    fireEvent.click(screen.getByTestId('service-filter-button'));
    await waitFor(() => {
      expect(screen.getByText('root')).toBeInTheDocument();
    });
  });

  it('calls onApply with pruned services when Apply is clicked', async () => {
    render(
      <ServiceFilter
        trace={makeTrace(['svc-a', 'svc-b', 'svc-c'])}
        prunedServices={new Set()}
        onApply={onApply}
      />
    );
    fireEvent.click(screen.getByTestId('service-filter-button'));
    await waitFor(() => screen.getByText('svc-b'));

    // Uncheck svc-b (it's the second checkbox — all start checked since prunedServices is empty)
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // toggle svc-b off

    fireEvent.click(screen.getByText('Apply'));
    expect(onApply).toHaveBeenCalledWith(new Set(['svc-b']));
  });
});
