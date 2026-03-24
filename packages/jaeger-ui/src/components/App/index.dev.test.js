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

jest.mock('./NotFound', () => () => <div data-testid="not-found" />);
jest.mock('./Page', () => ({ children }) => <div data-testid="page">{children}</div>);
jest.mock('../DependencyGraph', () => () => <div data-testid="dependency-graph" />);
jest.mock('../DeepDependencies', () => () => <div data-testid="deep-dependencies" />);
jest.mock('../QualityMetrics', () => () => <div data-testid="quality-metrics" />);
jest.mock('../SearchTracePage', () => () => <div data-testid="search-trace" />);
jest.mock('../TraceDiff', () => ({ __esModule: true, default: () => <div data-testid="trace-diff" /> }));
jest.mock('../TracePage', () => ({ __esModule: true, default: () => <div data-testid="trace-page" /> }));
jest.mock('../Monitor', () => () => <div data-testid="monitor" />);
jest.mock('../PlexusDemo', () => ({ __esModule: true, default: () => <div data-testid="plexus-demo" /> }));

jest.mock('../DependencyGraph/url', () => ({ ROUTE_PATH: '/dependencies' }));
jest.mock('../DeepDependencies/url', () => ({ ROUTE_PATH: '/deep-dependencies' }));
jest.mock('../QualityMetrics/url', () => ({ ROUTE_PATH: '/quality-metrics' }));
jest.mock('../SearchTracePage/url', () => ({ ROUTE_PATH: '/search' }));
jest.mock('../TraceDiff/url', () => ({ ROUTE_PATH: '/trace-diff', getUrl: jest.fn(), matches: jest.fn() }));
jest.mock('../TracePage/url', () => ({ ROUTE_PATH: '/trace/:id' }));
jest.mock('../Monitor/url', () => ({ ROUTE_PATH: '/monitor' }));
jest.mock('../PlexusDemo/url', () => ({ ROUTE_PATH: '/plexus-demo' }));

jest.mock('../../api/jaeger', () => ({
  __esModule: true,
  default: { apiRoot: null },
  DEFAULT_API_ROOT: 'http://localhost:16686/api',
}));
jest.mock('../../utils/config/process-scripts', () => jest.fn());
jest.mock('../../utils/prefix-url', () => jest.fn(() => '/prefix'));
jest.mock('../../utils/configure-store', () => ({
  store: {
    getState: jest.fn(() => ({})),
    dispatch: jest.fn(),
    subscribe: jest.fn(),
    replaceReducer: jest.fn(),
    [Symbol.observable]: jest.fn(),
  },
}));

jest.mock('../common/vars.css', () => ({}));
jest.mock('../common/utils.css', () => ({}));
jest.mock('antd/dist/reset.css', () => ({}));
jest.mock('./index.css', () => ({}));

// NOTE: JaegerUIApp is loaded via require() inside beforeAll (NOT via `import`)
// so that App/index.tsx is evaluated after process.env.DEV = 'true' is set.
// ES `import` declarations are transpiled to requires at the TOP of the output
// by babel-jest, which would execute them before any module-body code.
let JaegerUIApp;

beforeAll(() => {
  // This assignment runs AFTER all the hoisted import-requires above, so
  // process.env.DEV is already 'true' when App/index.tsx is evaluated.
  process.env.DEV = 'true';

  JaegerUIApp = require('./index').default;
});

afterAll(() => {
  delete process.env.DEV;
});

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
