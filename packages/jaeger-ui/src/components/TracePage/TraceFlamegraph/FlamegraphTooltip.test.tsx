// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FlamegraphTooltip from './FlamegraphTooltip';

describe('<FlamegraphTooltip />', () => {
  it('renders name, percentage, and duration', () => {
    render(
      <FlamegraphTooltip x={10} y={20} name="svc-a: op-1" value={500000} count={1} rootValue={1000000} />
    );
    expect(screen.getByText('svc-a: op-1')).toBeInTheDocument();
    expect(screen.getByText('50.00%')).toBeInTheDocument();
    expect(screen.getByText('500ms')).toBeInTheDocument();
  });

  it('shows span count when count > 1', () => {
    render(<FlamegraphTooltip x={10} y={20} name="svc: op" value={100000} count={5} rootValue={1000000} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Spans:')).toBeInTheDocument();
  });

  it('does not show span count when count is 1', () => {
    render(<FlamegraphTooltip x={10} y={20} name="svc: op" value={100000} count={1} rootValue={1000000} />);
    expect(screen.queryByText('Spans:')).not.toBeInTheDocument();
  });

  it('positions at x+10, y+10', () => {
    const { container } = render(
      <FlamegraphTooltip x={50} y={60} name="test" value={100} count={1} rootValue={1000} />
    );
    const tooltip = container.querySelector('.Flamegraph-tooltip');
    expect(tooltip).toHaveStyle({ left: '60px', top: '70px' });
  });

  it('shows hint text', () => {
    render(<FlamegraphTooltip x={10} y={20} name="test" value={100} count={1} rootValue={1000} />);
    expect(screen.getByText('Right click for more node viewing options')).toBeInTheDocument();
  });

  it('handles zero rootValue', () => {
    render(<FlamegraphTooltip x={10} y={20} name="test" value={100} count={1} rootValue={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
