// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// This file tests the JaegerUIApp in DEV mode (process.env.DEV = 'true').
// It must be a separate file so App/index is required (not imported) AFTER
// process.env.DEV is set.  ES `import` statements are hoisted above module
// body code by babel-jest, but `require()` calls inside `beforeAll` are not.

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

vi.mock('./NotFound', () => mockDefault(() => <div data-testid="not-found" />));
vi.mock('./Page', () => mockDefault(({ children }) => <div data-testid="page">{children}</div>));
vi.mock('../DependencyGraph', () => mockDefault(() => <div data-testid="dependency-graph" />));
vi.mock('../DeepDependencies', () => mockDefault(() => <div data-testid="deep-dependencies" />));
vi.mock('../QualityMetrics', () => mockDefault(() => <div data-testid="quality-metrics" />));
vi.mock('../SearchTracePage', () => mockDefault(() => <div data-testid="search-trace" />));
vi.mock('../TraceDiff', () => mockDefault(() => <div data-testid="trace-diff" />));
vi.mock('../TracePage', () => mockDefault(() => <div data-testid="trace-page" />));
vi.mock('../Monitor', () => mockDefault(() => <div data-testid="monitor" />));
vi.mock('../PlexusDemo', () => mockDefault(() => <div data-testid="plexus-demo" />));

vi.mock('../DependencyGraph/url', () => ({ ROUTE_PATH: '/dependencies' }));
vi.mock('../DeepDependencies/url', () => ({ ROUTE_PATH: '/deep-dependencies' }));
vi.mock('../QualityMetrics/url', () => ({ ROUTE_PATH: '/quality-metrics' }));
vi.mock('../SearchTracePage/url', () => ({ ROUTE_PATH: '/search' }));
vi.mock('../TraceDiff/url', () => ({ ROUTE_PATH: '/trace-diff', getUrl: jest.fn(), matches: jest.fn() }));
vi.mock('../TracePage/url', () => ({ ROUTE_PATH: '/trace/:id' }));
vi.mock('../Monitor/url', () => ({ ROUTE_PATH: '/monitor' }));
vi.mock('../PlexusDemo/url', () => ({ ROUTE_PATH: '/plexus-demo' }));

vi.mock('../../api/jaeger', () => ({
  default: { apiRoot: null },
  DEFAULT_API_ROOT: 'http://localhost:16686/api',
}));
vi.mock('../../utils/config/process-scripts', () => mockDefault(jest.fn()));
vi.mock('../../utils/prefix-url', () => mockDefault(jest.fn(() => '/prefix')));
vi.mock('../../utils/configure-store', () => ({
  store: {
    getState: jest.fn(() => ({})),
    dispatch: jest.fn(),
    subscribe: jest.fn(),
    replaceReducer: jest.fn(),
    [Symbol.observable]: jest.fn(),
  },
}));

vi.mock('../common/vars.css', () => ({}));
vi.mock('../common/utils.css', () => ({}));
vi.mock('antd/dist/reset.css', () => ({}));
vi.mock('./index.css', () => ({}));

// In Vitest, import.meta.env.DEV is always true, so we can use a static import.
// The require() trick from Jest/CJS is not needed here.
import JaegerUIApp from './index';

describe('JaegerUIApp in DEV mode', () => {
  it('should render the plexus-demo route', async () => {
    render(
      <MemoryRouter initialEntries={['/plexus-demo']}>
        <JaegerUIApp />
      </MemoryRouter>
    );
    // PlexusDemoPage is a React.lazy component in DEV mode; wait for the
    // Suspense boundary to resolve before asserting.
    expect(await screen.findByTestId('plexus-demo')).toBeInTheDocument();
  });
});
