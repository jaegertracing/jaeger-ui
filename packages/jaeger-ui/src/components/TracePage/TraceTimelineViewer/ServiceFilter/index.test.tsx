// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import ServiceFilter from './index';
import { IOtelTrace, IOtelSpan } from '../../../../types/otel';

function makeTrace(serviceNames: string[], rootServiceNames?: string[]): IOtelTrace {
  const services = serviceNames.map(name => ({ name, numberOfSpans: 3 }));
  const roots = rootServiceNames ?? [serviceNames[0]];
  const rootSpans = roots.map((name, i) => ({
    spanID: `root-${i}`,
    resource: { serviceName: name, attributes: [] },
  })) as unknown as IOtelSpan[];
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

  it('renders Save as Default button', async () => {
    render(
      <ServiceFilter trace={makeTrace(['svc-a', 'svc-b'])} prunedServices={new Set()} onApply={onApply} />
    );
    fireEvent.click(screen.getByTestId('service-filter-button'));
    await waitFor(() => {
      expect(screen.getByText('Save as Default')).toBeInTheDocument();
    });
  });

  it('saves to localStorage and calls onApply when Save as Default is clicked', async () => {
    localStorage.clear();
    render(
      <ServiceFilter
        trace={makeTrace(['svc-a', 'svc-b', 'svc-c'])}
        prunedServices={new Set()}
        onApply={onApply}
      />
    );
    fireEvent.click(screen.getByTestId('service-filter-button'));
    await waitFor(() => screen.getByText('svc-b'));

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // toggle svc-b off

    fireEvent.click(screen.getByText('Save as Default'));
    expect(onApply).toHaveBeenCalledWith(new Set(['svc-b']));
    const stored = JSON.parse(localStorage.getItem('svcFilter.defaults') ?? '{}');
    expect(stored.prunedServices).toEqual(['svc-b']);
  });

  it('opens popover via keyboard (Enter)', async () => {
    render(
      <ServiceFilter trace={makeTrace(['svc-a', 'svc-b'])} prunedServices={new Set()} onApply={onApply} />
    );
    const button = screen.getByTestId('service-filter-button');
    fireEvent.keyDown(button, { key: 'Enter' });
    await waitFor(() => {
      expect(screen.getByText('Filter Services')).toBeInTheDocument();
    });
  });

  it('has aria-pressed on the filter button', () => {
    render(
      <ServiceFilter
        trace={makeTrace(['svc-a', 'svc-b'])}
        prunedServices={new Set(['svc-b'])}
        onApply={onApply}
      />
    );
    expect(screen.getByTestId('service-filter-button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('sets title attribute on service names for truncation tooltip', async () => {
    render(
      <ServiceFilter
        trace={makeTrace(['very-long-service-name-that-should-be-truncated', 'svc-b'])}
        prunedServices={new Set()}
        onApply={onApply}
      />
    );
    fireEvent.click(screen.getByTestId('service-filter-button'));
    await waitFor(() => {
      const el = screen.getByText('very-long-service-name-that-should-be-truncated');
      expect(el).toHaveAttribute('title', 'very-long-service-name-that-should-be-truncated');
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

  it('can toggle a service off then back on', async () => {
    render(
      <ServiceFilter
        trace={makeTrace(['svc-a', 'svc-b', 'svc-c'])}
        prunedServices={new Set()}
        onApply={onApply}
      />
    );
    fireEvent.click(screen.getByTestId('service-filter-button'));
    await waitFor(() => screen.getByText('svc-b'));

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // uncheck svc-b
    fireEvent.click(checkboxes[1]); // re-check svc-b

    fireEvent.click(screen.getByText('Apply'));
    expect(onApply).toHaveBeenCalledWith(new Set()); // no services pruned
  });

  it('shows warning when all services are unchecked', async () => {
    render(
      <ServiceFilter
        trace={makeTrace(['svc-a', 'svc-b'], ['svc-a', 'svc-b'])}
        prunedServices={new Set()}
        onApply={onApply}
      />
    );
    fireEvent.click(screen.getByTestId('service-filter-button'));
    await waitFor(() => screen.getByText('svc-a'));

    fireEvent.click(screen.getByText('Select None'));
    await waitFor(() => {
      expect(screen.getByText('At least one service must be visible')).toBeInTheDocument();
    });
  });

  it('shows warning when all root services would be pruned (multi-root)', async () => {
    // Both svc-a and svc-b are roots; uncheck both
    render(
      <ServiceFilter
        trace={makeTrace(['svc-a', 'svc-b', 'svc-c'], ['svc-a', 'svc-b'])}
        prunedServices={new Set()}
        onApply={onApply}
      />
    );
    fireEvent.click(screen.getByTestId('service-filter-button'));
    await waitFor(() => screen.getByText('svc-a'));

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // uncheck svc-a
    fireEvent.click(checkboxes[1]); // uncheck svc-b

    await waitFor(() => {
      expect(screen.getByText('At least one root span service must remain visible')).toBeInTheDocument();
    });
  });

  describe('single root service locking', () => {
    it('disables the checkbox for the sole root service', async () => {
      // svc-a is the only root service
      render(
        <ServiceFilter
          trace={makeTrace(['svc-a', 'svc-b', 'svc-c'])}
          prunedServices={new Set()}
          onApply={onApply}
        />
      );
      fireEvent.click(screen.getByTestId('service-filter-button'));
      await waitFor(() => screen.getByText('svc-a'));

      const checkboxes = screen.getAllByRole('checkbox');
      // svc-a is first (sorted), and should be disabled
      expect(checkboxes[0]).toBeDisabled();
      expect(checkboxes[1]).not.toBeDisabled();
      expect(checkboxes[2]).not.toBeDisabled();
    });

    it('Select None keeps the sole root service selected', async () => {
      render(
        <ServiceFilter
          trace={makeTrace(['svc-a', 'svc-b', 'svc-c'])}
          prunedServices={new Set()}
          onApply={onApply}
        />
      );
      fireEvent.click(screen.getByTestId('service-filter-button'));
      await waitFor(() => screen.getByText('svc-a'));

      fireEvent.click(screen.getByText('Select None'));
      fireEvent.click(screen.getByText('Apply'));
      // svc-a should NOT be in the pruned set
      expect(onApply).toHaveBeenCalledWith(new Set(['svc-b', 'svc-c']));
    });

    it('does not lock root services when multiple root service names exist', async () => {
      // Both svc-a and svc-b are root services
      render(
        <ServiceFilter
          trace={makeTrace(['svc-a', 'svc-b', 'svc-c'], ['svc-a', 'svc-b'])}
          prunedServices={new Set()}
          onApply={onApply}
        />
      );
      fireEvent.click(screen.getByTestId('service-filter-button'));
      await waitFor(() => screen.getByText('svc-a'));

      const checkboxes = screen.getAllByRole('checkbox');
      // All checkboxes should be enabled
      expect(checkboxes[0]).not.toBeDisabled();
      expect(checkboxes[1]).not.toBeDisabled();
      expect(checkboxes[2]).not.toBeDisabled();
    });

    it('shows root badge on all root services when multiple exist', async () => {
      render(
        <ServiceFilter
          trace={makeTrace(['svc-a', 'svc-b', 'svc-c'], ['svc-a', 'svc-b'])}
          prunedServices={new Set()}
          onApply={onApply}
        />
      );
      fireEvent.click(screen.getByTestId('service-filter-button'));
      await waitFor(() => screen.getByText('svc-a'));

      const badges = screen.getAllByText('root');
      expect(badges).toHaveLength(2);
    });
  });
});
