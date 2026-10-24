// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import LoadingIndicator from './LoadingIndicator';

describe('<LoadingIndicator />', () => {
  it('is decorative by default: hidden from assistive technology and no live region', () => {
    const { container } = render(<LoadingIndicator />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('announces the label as a status when one is given', () => {
    render(<LoadingIndicator label="Loading traces" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading traces');
  });

  it('keeps the icon hidden from assistive technology when labelled', () => {
    const { container } = render(<LoadingIndicator label="Loading traces" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies the layout class names to the icon', () => {
    const { container } = render(<LoadingIndicator centered vcentered small className="custom" />);
    expect(container.querySelector('svg')).toHaveClass(
      'LoadingIndicator',
      'is-centered',
      'is-vcentered',
      'is-small',
      'custom'
    );
  });
});
