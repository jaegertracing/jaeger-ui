// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import LoadingIndicator from './LoadingIndicator';

describe('<LoadingIndicator />', () => {
  it('is announced to assistive technology as a status named "Loading"', () => {
    render(<LoadingIndicator />);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });

  it('applies the layout class names', () => {
    render(<LoadingIndicator centered vcentered small className="custom" />);
    const indicator = screen.getByRole('status');
    expect(indicator).toHaveClass('LoadingIndicator', 'is-centered', 'is-vcentered', 'is-small', 'custom');
  });

  it('lets callers override the accessible label', () => {
    render(<LoadingIndicator aria-label="Loading traces" />);
    expect(screen.getByRole('status', { name: 'Loading traces' })).toBeInTheDocument();
  });
});
