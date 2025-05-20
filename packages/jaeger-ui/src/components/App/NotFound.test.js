// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import NotFound from './NotFound';

jest.mock('../../utils/prefix-url', () => () => '/');
jest.mock('../common/ErrorMessage', () => ({ error }) => (
  <div data-testid="error-message">{error?.message}</div>
));

describe('NotFound tests', () => {
  it('renders error title and home link without error', () => {
    render(
      <MemoryRouter>
        <NotFound error={null} />
      </MemoryRouter>
    );

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Back home')).toBeInTheDocument();
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
  });

  it('renders error message if error is provided', () => {
    const testError = new Error('Page not found');
    render(
      <MemoryRouter>
        <NotFound error={testError} />
      </MemoryRouter>
    );

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    expect(screen.getByText('Back home')).toBeInTheDocument();
  });
});
