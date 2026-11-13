// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';

import CountCard from './CountCard';
import type { TExample } from '../common/ExamplesLink';

describe('CountCard', () => {
  const count = 108;
  const title = 'Test Title';
  const examples: TExample[] = [{ traceID: 'example-trace-id' }];

  it('renders null when props.count or props.title is absent', () => {
    const { container: containerWithoutTitle } = render(<CountCard count={count} />);
    expect(containerWithoutTitle.firstChild).toBe(null);
    const { container: containerWithoutCount } = render(<CountCard title={title} />);
    expect(containerWithoutCount.firstChild).toBe(null);
  });

  it('renders as expected when given count and title', () => {
    render(<CountCard count={count} title={title} />);

    expect(screen.getByText(count.toString())).toBeInTheDocument();
    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it('renders as expected when given count, title, and examples', () => {
    render(<CountCard count={count} title={title} examples={examples} />);

    expect(screen.getByText(count.toString())).toBeInTheDocument();
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText('Examples')).toBeInTheDocument();
  });
});
