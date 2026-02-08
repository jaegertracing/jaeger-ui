// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Provider } from 'react-redux';
import { Route, Navigate, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import NotFound from './NotFound';
import Page from './Page';
import DependencyGraph from '../DependencyGraph';
import { ROUTE_PATH as dependenciesPath } from '../DependencyGraph/url';
import DeepDependencies from '../DeepDependencies';
import { ROUTE_PATH as deepDependenciesPath } from '../DeepDependencies/url';
import QualityMetrics from '../QualityMetrics';
import { ROUTE_PATH as qualityMetricsPath } from '../QualityMetrics/url';
import SearchTracePage from '../SearchTracePage';
import { ROUTE_PATH as searchPath } from '../SearchTracePage/url';
import TraceDiff from '../TraceDiff';
import { ROUTE_PATH as traceDiffPath } from '../TraceDiff/url';
import TracePage from '../TracePage';
import { ROUTE_PATH as tracePath } from '../TracePage/url';
import MonitorATMPage from '../Monitor';
import { ROUTE_PATH as monitorATMPath } from '../Monitor/url';
import JaegerAPI, { DEFAULT_API_ROOT } from '../../api/jaeger';
import processScripts from '../../utils/config/process-scripts';
import prefixUrl from '../../utils/prefix-url';

import '../common/vars.css';
import '../common/utils.css';
import 'antd/dist/reset.css';
import './index.css';
import { store } from '../../utils/configure-store';
import ThemeProvider from './ThemeProvider';

// Create a React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// Initialize API configuration and process configuration scripts at module level
// to ensure they run once when the application is loaded, before any components are rendered
JaegerAPI.apiRoot = DEFAULT_API_ROOT;
processScripts();

export default function JaegerUIApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Provider store={store as any}>
          {
            // the Page component is a connected component (wrapped by Redux's connect HOC)
            // that is also wrapped by a custom withRouteProps HOC.
            // The @ts-ignore was added because of a specific TypeScript error that occurs
            // when mixing Redux 5/9, React 19, and complex HOCs.
          }
          {/* @ts-expect-error - TypeScript error with Redux 5/9, React 19, and complex HOCs */}
          <Page>
            <Routes>
              <Route path={searchPath} element={<SearchTracePage />} />
              <Route path={traceDiffPath} element={<TraceDiff />} />
              <Route path={tracePath} element={<TracePage />} />
              <Route path={dependenciesPath} element={<DependencyGraph />} />
              <Route path={deepDependenciesPath} element={<DeepDependencies />} />
              <Route path={qualityMetricsPath} element={<QualityMetrics />} />
              <Route path={monitorATMPath} element={<MonitorATMPage />} />
              <Route path="/" element={<Navigate to={searchPath} replace />} />
              <Route path={prefixUrl()} element={<Navigate to={searchPath} replace />} />
              <Route path={prefixUrl('/')} element={<Navigate to={searchPath} replace />} />
              <Route path="*" element={<NotFound error="Page not found" />} />
            </Routes>
          </Page>
        </Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
