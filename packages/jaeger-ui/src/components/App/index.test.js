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
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

jest.mock('./NotFound', () => () => <div data-testid="not-found" />);
jest.mock('./Page', () => ({ children }) => <div data-testid="page">{children}</div>);
jest.mock('../DependencyGraph', () => () => <div data-testid="dependency-graph" />);
jest.mock('../DeepDependencies', () => () => <div data-testid="deep-dependencies" />);
jest.mock('../QualityMetrics', () => () => <div data-testid="quality-metrics" />);
jest.mock('../SearchTracePage', () => () => <div data-testid="search-trace" />);
jest.mock('../TraceDiff', () => () => <div data-testid="trace-diff" />);
jest.mock('../TracePage', () => () => <div data-testid="trace-page" />);
jest.mock('../Monitor', () => () => <div data-testid="monitor" />);

jest.mock('../DependencyGraph/url', () => ({ ROUTE_PATH: '/dependencies' }));
jest.mock('../DeepDependencies/url', () => ({ ROUTE_PATH: '/deep-dependencies' }));
jest.mock('../QualityMetrics/url', () => ({ ROUTE_PATH: '/quality-metrics' }));
jest.mock('../SearchTracePage/url', () => ({ ROUTE_PATH: '/search' }));
jest.mock('../TraceDiff/url', () => ({ ROUTE_PATH: '/trace-diff' }));
jest.mock('../TracePage/url', () => ({ ROUTE_PATH: '/trace' }));
jest.mock('../Monitor/url', () => ({ ROUTE_PATH: '/monitor' }));

jest.mock('../../api/jaeger', () => ({
  __esModule: true,
  default: { apiRoot: null },
  DEFAULT_API_ROOT: 'http://localhost:16686/api',
}));

jest.mock('../../utils/config/process-scripts', () => jest.fn());
jest.mock('../../utils/prefix-url', () => jest.fn(() => '/prefix'));

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

jest.mock('../../utils/configure-store', () => ({
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

jest.mock('../../utils/useHistory', () => ({
  HistoryProvider: ({ children }) => children,
}));

jest.mock('../common/vars.css', () => ({}));
jest.mock('../common/utils.css', () => ({}));
jest.mock('antd/dist/reset.css', () => ({}));
jest.mock('./index.css', () => ({}));

import JaegerUIApp from './index';
import JaegerAPI, { DEFAULT_API_ROOT } from '../../api/jaeger';
import processScripts from '../../utils/config/process-scripts';

const renderWithPath = pathname => {
  mockHistory = createMockHistory(pathname);
  return render(<JaegerUIApp Router={MemoryRouter} routerProps={{ initialEntries: [pathname] }} />);
};

describe('JaegerUIApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    JaegerAPI.apiRoot = null;
    mockHistory = createMockHistory();
  });

  it('should initialize API and process scripts', () => {
    renderWithPath('/search');
    expect(JaegerAPI.apiRoot).toBe(DEFAULT_API_ROOT);
    expect(processScripts).toHaveBeenCalled();
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
    ['/trace-diff', 'trace-diff'],
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
    // This verifies that the Redirect component is working correctly
    const { getByTestId } = renderWithPath('/');
    expect(getByTestId('search-trace')).toBeInTheDocument();
  });

  it('should handle constructor with props', () => {
    expect(() => new JaegerUIApp({})).not.toThrow();
  });

  it('should have complete render method coverage', () => {
    const { container } = renderWithPath('/search');

    expect(container.firstChild).toBeDefined();
    expect(container.querySelector('[data-testid="page"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="search-trace"]')).toBeInTheDocument();
  });
});
