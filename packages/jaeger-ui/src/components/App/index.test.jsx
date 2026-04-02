// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';
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

vi.mock('../DependencyGraph/url', () => ({ ROUTE_PATH: '/dependencies' }));
vi.mock('../DeepDependencies/url', () => ({ ROUTE_PATH: '/deep-dependencies' }));
vi.mock('../QualityMetrics/url', () => ({ ROUTE_PATH: '/quality-metrics' }));
vi.mock('../SearchTracePage/url', () => ({ ROUTE_PATH: '/search' }));
vi.mock('../TraceDiff/url', () => ({ ROUTE_PATH: '/trace-diff', getUrl: jest.fn(), matches: jest.fn() }));
vi.mock('../TracePage/url', () => ({ ROUTE_PATH: '/trace/:id' }));
vi.mock('../Monitor/url', () => ({ ROUTE_PATH: '/monitor' }));

vi.mock('../PlexusDemo', () => mockDefault(() => <div data-testid="plexus-demo" />));
vi.mock('../PlexusDemo/url', () => ({ ROUTE_PATH: '/plexus-demo' }));

vi.mock('../../api/jaeger', () => ({
  default: { apiRoot: null },
  DEFAULT_API_ROOT: 'http://localhost:16686/api',
}));

vi.mock('../../utils/config/process-scripts', () => mockDefault(jest.fn()));
vi.mock('../../utils/prefix-url', () => mockDefault(jest.fn(() => '/prefix')));

const createMockHistory = (pathname = '/') => ({
  length: 1,
  action: 'POP',
  location: { pathname, search: '', hash: '', state: null },
  push: jest.fn(),
  replace: jest.fn(),
  go: jest.fn(),
  goBack: jest.fn(),
  goForward: jest.fn(),
  block: jest.fn(),
  listen: jest.fn(() => jest.fn()),
  createHref: jest.fn(),
});

let mockHistory = createMockHistory();

vi.mock('../../utils/configure-store', () => ({
  get history() {
    return mockHistory;
  },
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

import JaegerAPI, { DEFAULT_API_ROOT } from '../../api/jaeger';
import processScripts from '../../utils/config/process-scripts';

// Module-level initialization happens at import time
import JaegerUIApp from './index';

const renderWithPath = pathname => {
  mockHistory = createMockHistory(pathname);
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <JaegerUIApp />
    </MemoryRouter>
  );
};

describe('JaegerUIApp', () => {
  beforeEach(() => {
    mockHistory = createMockHistory();
  });

  // Module-level initialization tests - these run once when module is imported
  it('should initialize API and process scripts at module load time', () => {
    // Verify it was called exactly once during module initialization
    expect(JaegerAPI.apiRoot).toBe(DEFAULT_API_ROOT);
    expect(processScripts).toHaveBeenCalledTimes(1);
  });

  it('should render Page wrapper', () => {
    const { getByTestId } = renderWithPath('/search');
    expect(getByTestId('page')).toBeInTheDocument();
  });

  it('should render without throwing errors', () => {
    expect(() => renderWithPath('/search')).not.toThrow();
  });

  const routes = [
    ['/search', 'search-trace'],
    // TraceDiff is now routed under /trace/:id - when id contains "...", TraceRouter renders TraceDiff
    ['/trace/abc...def', 'trace-diff'],
    ['/trace/123', 'trace-page'],
    ['/dependencies', 'dependency-graph'],
    ['/deep-dependencies', 'deep-dependencies'],
    ['/quality-metrics', 'quality-metrics'],
    ['/monitor', 'monitor'],
  ];

  routes.forEach(([path, testId]) => {
    it(`should render correct component for ${path}`, () => {
      const { getByTestId } = renderWithPath(path);
      expect(getByTestId(testId)).toBeInTheDocument();
    });
  });

  it('should render NotFound for unknown routes', () => {
    const { getByTestId } = renderWithPath('/unknown');
    expect(getByTestId('not-found')).toBeInTheDocument();
  });

  it('should handle root path redirect', () => {
    // Test that when accessing root path, the SearchTracePage component is rendered
    // This verifies that the Navigate component is working correctly
    const { getByTestId } = renderWithPath('/');
    expect(getByTestId('search-trace')).toBeInTheDocument();
  });

  it('should have complete render method coverage', () => {
    const { container } = renderWithPath('/search');

    expect(container.firstChild).toBeDefined();
    expect(container.querySelector('[data-testid="page"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="search-trace"]')).toBeInTheDocument();
  });

  it('should not re-initialize on component re-renders (module-level init is one-time)', () => {
    const { rerender } = renderWithPath('/search');
    rerender(
      <MemoryRouter initialEntries={['/trace/abc...def']}>
        <JaegerUIApp />
      </MemoryRouter>
    );
    // processScripts was called once at module load, not on each render
    expect(processScripts).toHaveBeenCalledTimes(1);
  });

  it('should render PlexusDemo for /plexus-demo (DEV mode is always true in Vitest)', async () => {
    // In Vitest, import.meta.env.DEV is always true, so PlexusDemoPage is registered.
    // The Suspense boundary wraps the lazy component; wait for it to resolve.
    const { findByTestId } = renderWithPath('/plexus-demo');
    expect(await findByTestId('plexus-demo')).toBeInTheDocument();
  });
});
