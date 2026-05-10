// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CountCard from './CountCard';

describe('CountCard', () => {
  const count = 108;
  const title = 'Test Title';
  const examples = ['Examples'];

  it('renders null when props.count or props.title is absent', () => {
    const { container: containerWithoutTitle } = render(<CountCard count={count} />);
    expect(containerWithoutTitle.firstChild).toBe(null);
    const { container: containerWithoutCount } = render(<CountCard title={title} />);
    expect(containerWithoutCount.firstChild).toBe(null);
  });

  it('renders as expected when given count and title', () => {
    render(<CountCard count={count} title={title} />);

    expect(screen.getByText(count)).toBeInTheDocument();
    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it('renders as expected when given count, title, and examples', () => {
    render(<CountCard count={count} title={title} examples={examples} />);

    expect(screen.getByText(count)).toBeInTheDocument();
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText(examples[0])).toBeInTheDocument();
  });
});
