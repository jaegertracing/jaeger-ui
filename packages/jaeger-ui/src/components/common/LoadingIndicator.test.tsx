// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingIndicator from './LoadingIndicator';

describe('LoadingIndicator', () => {
  it('renders correctly', () => {
    const { container } = render(<LoadingIndicator />);
    expect(container.querySelector('.LoadingIndicator')).toBeInTheDocument();
  });

  it('renders with a message when provided', () => {
    render(<LoadingIndicator message='Loading content...' />);
    expect(screen.getByText('Loading content...')).toBeInTheDocument();
    expect(screen.getByText('Loading content...')).toHaveClass('LoadingIndicator--message');
  });

  it('applies centering classes when centered prop is true', () => {
    const { container } = render(<LoadingIndicator centered message='Centered loading' />);
    const wrapper = container.querySelector('.LoadingIndicator--wrapper');
    expect(wrapper).toHaveClass('is-centered');
  });

  it('applies custom className and vcentered to the wrapper when message is present', () => {
    const { container } = render(
      <LoadingIndicator message='Loading' className='custom-class' vcentered />,
    );
    const wrapper = container.querySelector('.LoadingIndicator--wrapper');
    expect(wrapper).toHaveClass('custom-class');
    expect(wrapper).toHaveClass('is-vcentered');
  });
});
