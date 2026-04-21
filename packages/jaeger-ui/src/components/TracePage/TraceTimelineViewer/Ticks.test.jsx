// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, act } from '@testing-library/react';

import Ticks from './Ticks';

describe('<Ticks>', () => {
  it('renders without exploding', () => {
    const { container } = render(<Ticks endTime={200} numTicks={5} showLabels startTime={100} />);
    expect(container).toBeDefined();
  });

  it('renders tick lines for every tick regardless of showLabels', () => {
    const { container } = render(<Ticks numTicks={5} />);
    expect(container.querySelectorAll('.Ticks--tick')).toHaveLength(5);
  });

  it('renders labels when showLabels is true', () => {
    const { container } = render(<Ticks endTime={1000} numTicks={5} showLabels startTime={0} />);
    expect(container.querySelectorAll('.Ticks--tickLabel').length).toBeGreaterThan(0);
  });

  it('applies isEndAnchor class only to the last label', () => {
    const { container } = render(<Ticks endTime={1000} numTicks={5} showLabels startTime={0} />);
    const anchors = container.querySelectorAll('.Ticks--tickLabel.isEndAnchor');
    expect(anchors).toHaveLength(1);
  });

  it('does not render labels when showLabels is omitted', () => {
    const { container } = render(<Ticks numTicks={5} />);
    expect(container.querySelectorAll('.Ticks--tickLabel')).toHaveLength(0);
  });

  it('skips intermediate labels and keeps first and last when container is narrow', () => {
    let observerCallback;
    const mockResizeObserver = vi.fn().mockImplementation(function (cb) {
      observerCallback = cb;
      this.observe = vi.fn();
      this.disconnect = vi.fn();
    });
    vi.stubGlobal('ResizeObserver', mockResizeObserver);

    const { container } = render(<Ticks endTime={1000} numTicks={5} showLabels startTime={0} />);

    act(() => {
      observerCallback([{ contentRect: { width: 200 } }]);
    });

    const labels = container.querySelectorAll('.Ticks--tickLabel');
    expect(labels.length).toBeLessThan(5);
    expect(labels[0].classList.contains('isEndAnchor')).toBe(false);
    expect(labels[labels.length - 1].classList.contains('isEndAnchor')).toBe(true);

    vi.unstubAllGlobals();
  });
});
