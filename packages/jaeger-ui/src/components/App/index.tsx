// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Provider } from 'react-redux';
import { Route, Routes, Navigate } from 'react-router-dom';
import { AppQueryClientProvider } from '../../query/app-query-client';

import NotFound from './NotFound';
import { PageImpl as Page } from './Page';
import DependencyGraph from '../DependencyGraph';
import { ROUTE_PATH as dependenciesPath } from '../DependencyGraph/url';
import DeepDependencies from '../DeepDependencies';
import { ROUTE_PATH as deepDependenciesPath } from '../DeepDependencies/url';
import QualityMetrics from '../QualityMetrics';
import { ROUTE_PATH as qualityMetricsPath } from '../QualityMetrics/url';
import SearchTracePage from '../SearchTracePage';
import { ROUTE_PATH as searchPath } from '../SearchTracePage/url';
import TraceRouter from './TraceRouter';
import { ROUTE_PATH as tracePath } from '../TracePage/url';
import MonitorATMPage from '../Monitor';
import { ROUTE_PATH as monitorATMPath } from '../Monitor/url';
import { ROUTE_PATH as plexusDemoPath } from '../PlexusDemo/url';
import JaegerAPI, { DEFAULT_API_ROOT } from '../../api/jaeger';
import processScripts from '../../utils/config/process-scripts';
import prefixUrl from '../../utils/prefix-url';

import '../common/vars.css';
import '../common/utils.css';
import 'antd/dist/reset.css';
import './index.css';
import { store } from '../../utils/configure-store';
import ThemeProvider from './ThemeProvider';
import { JaegerAssistantProvider } from './JaegerAssistantContext';

// Initialize API configuration and process configuration scripts at module level
// to ensure they run once when the application is loaded, before any components are rendered
JaegerAPI.apiRoot = DEFAULT_API_ROOT;
processScripts();

// Only include the Plexus demo in development builds.
// Vite replaces import.meta.env.DEV with false in production, which causes Rollup
// to tree-shake the dynamic import and exclude the demo files from the prod bundle.
const PlexusDemoPage = import.meta.env.DEV ? React.lazy(() => import('../PlexusDemo')) : null;

// The route table is exported so that index.test.ts can verify that
// KNOWN_SUB_PATHS covers every path registered here. The <Routes> below is rendered
// directly from this array, so the two cannot diverge.
export const ROUTES: { path: string; element: React.ReactNode }[] = [
  { path: searchPath, element: <SearchTracePage /> },
  { path: tracePath, element: <TraceRouter /> },
  { path: dependenciesPath, element: <DependencyGraph /> },
  { path: deepDependenciesPath, element: <DeepDependencies /> },
  { path: qualityMetricsPath, element: <QualityMetrics /> },
  { path: monitorATMPath, element: <MonitorATMPage /> },
  ...(PlexusDemoPage
    ? [
        {
          path: plexusDemoPath,
          element: (
            <React.Suspense fallback={null}>
              <PlexusDemoPage />
            </React.Suspense>
          ),
        },
      ]
    : []),
];

export default function JaegerUIApp() {
  return (
    <AppQueryClientProvider>
      <ThemeProvider>
        <Provider store={store as any}>
          <JaegerAssistantProvider>
            <Page>
              <Routes>
                {ROUTES.map(({ path, element }) => (
                  <Route key={path} path={path} element={element} />
                ))}
                <Route path="/" element={<Navigate to={searchPath} replace />} />
                <Route path={prefixUrl()} element={<Navigate to={searchPath} replace />} />
                <Route path={prefixUrl('/')} element={<Navigate to={searchPath} replace />} />
                <Route path="*" element={<NotFound error="Page not found" />} />
              </Routes>
            </Page>
          </JaegerAssistantProvider>
        </Provider>
      </ThemeProvider>
    </AppQueryClientProvider>
  );
}
