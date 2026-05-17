// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import HeatmapLegend from './HeatmapLegend';

describe('HeatmapLegend', () => {
  it('renders without crashing', () => {
    const { container } = render(<HeatmapLegend />);
    expect(container).toBeTruthy();
  });

  it('shows title text', () => {
    render(<HeatmapLegend />);
    expect(screen.getByText('Latency Heatmap')).toBeInTheDocument();
  });

  it('shows Fastest label', () => {
    render(<HeatmapLegend />);
    expect(screen.getByText('Fastest')).toBeInTheDocument();
  });

  it('shows Slowest label', () => {
    render(<HeatmapLegend />);
    expect(screen.getByText('Slowest')).toBeInTheDocument();
  });

  it('shows P50 label', () => {
    render(<HeatmapLegend />);
    expect(screen.getByText('P50')).toBeInTheDocument();
  });

  it('shows P95 label', () => {
    render(<HeatmapLegend />);
    expect(screen.getByText('P95')).toBeInTheDocument();
  });

  it('shows critical path hint', () => {
    render(<HeatmapLegend />);
    expect(screen.getByText(/critical path/i)).toBeInTheDocument();
  });

  it('has aria-label for accessibility', () => {
    render(<HeatmapLegend />);
    expect(screen.getByRole('generic', { name: /latency heatmap legend/i })).toBeInTheDocument();
  });

  it('renders 20 color segments', () => {
    const { container } = render(<HeatmapLegend />);
    const segments = container.querySelectorAll('.HeatmapLegend--segment');
    expect(segments.length).toBe(20);
  });

  it('first segment has a background color set', () => {
    const { container } = render(<HeatmapLegend />);
    const first = container.querySelector('.HeatmapLegend--segment') as HTMLElement;
    // JSDOM normalizes hsl() to rgb(); just verify the style is non-empty
    expect(first.style.backgroundColor).toBeTruthy();
  });
});
