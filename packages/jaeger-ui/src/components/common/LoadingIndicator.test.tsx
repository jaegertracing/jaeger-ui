// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { screen, render } from '@testing-library/react';

import LoadingIndicator from './LoadingIndicator';
import '@testing-library/jest-dom';

describe('LoadingIndicator', () => {
  it('renders with default props', () => {
    render(<LoadingIndicator />);
    const indicator = screen.getByRole('status');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveAttribute('aria-label', 'Loading');
  });

  it('renders with centered class when centered prop is true', () => {
    render(<LoadingIndicator centered />);
    const indicator = screen.getByRole('status');
    expect(indicator.className).toContain('is-centered');
  });

  it('renders with small class when small prop is true', () => {
    render(<LoadingIndicator small />);
    const indicator = screen.getByRole('status');
    expect(indicator.className).toContain('is-small');
  });

  it('renders with custom className', () => {
    render(<LoadingIndicator className="custom-class" />);
    const indicator = screen.getByRole('status');
    expect(indicator.className).toContain('custom-class');
  });

  it('has accessible role and label', () => {
    render(<LoadingIndicator />);
    const indicator = screen.getByRole('status');
    expect(indicator).toHaveAttribute('role', 'status');
    expect(indicator).toHaveAttribute('aria-label', 'Loading');
  });
});
