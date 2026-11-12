// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HeatmapLegend from './HeatmapLegend';
import { HEATMAP_STEPS } from '../../../utils/span-latency-stats';

describe('HeatmapLegend', () => {
  it('renders without crashing', () => {
    const { container } = render(<HeatmapLegend />);
    expect(container).toBeTruthy();
  });

  it('shows title text', () => {
    render(<HeatmapLegend />);
    expect(screen.getByText('Latency Heatmap')).toBeInTheDocument();
  });

  it('labels the fast end of the scale relative to the median', () => {
    render(<HeatmapLegend />);
    expect(screen.getByText('½× median or less')).toBeInTheDocument();
  });

  it('labels the slow end of the scale relative to the median', () => {
    render(<HeatmapLegend />);
    expect(screen.getByText('2× median or more')).toBeInTheDocument();
  });

  it('shows Median label', () => {
    render(<HeatmapLegend />);
    expect(screen.getByText('Median')).toBeInTheDocument();
  });

  it('explains which spans are compared', () => {
    render(<HeatmapLegend />);
    expect(screen.getByText(/same service and operation/i)).toBeInTheDocument();
  });

  it('shows the no-peers swatch', () => {
    const { container } = render(<HeatmapLegend />);
    expect(screen.getByText('No peers')).toBeInTheDocument();
    const swatch = container.querySelector('.HeatmapLegend--swatch') as HTMLElement;
    expect(swatch.style.backgroundColor).toBe('var(--heatmap-no-peers)');
  });

  it('has aria-label for accessibility', () => {
    render(<HeatmapLegend />);
    expect(screen.getByRole('group', { name: /latency heatmap legend/i })).toBeInTheDocument();
  });

  it('reports its rendered height so the layout below can follow it', () => {
    const heightSpy = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(86);
    try {
      const onHeightChange = vi.fn();
      render(<HeatmapLegend onHeightChange={onHeightChange} />);
      expect(onHeightChange).toHaveBeenCalledWith(86);
    } finally {
      heightSpy.mockRestore();
    }
  });

  it('does not report a zero height before it is laid out', () => {
    const onHeightChange = vi.fn();
    render(<HeatmapLegend onHeightChange={onHeightChange} />);
    expect(onHeightChange).not.toHaveBeenCalled();
  });

  it('renders one segment per heatmap color token, in order', () => {
    const { container } = render(<HeatmapLegend />);
    const segments = [...container.querySelectorAll<HTMLElement>('.HeatmapLegend--segment')];
    expect(segments.map(segment => segment.style.backgroundColor)).toEqual(
      Array.from({ length: HEATMAP_STEPS }, (_, i) => `var(--heatmap-${i + 1})`)
    );
  });
});
