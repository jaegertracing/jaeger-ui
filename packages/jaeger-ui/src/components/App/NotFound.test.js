// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
