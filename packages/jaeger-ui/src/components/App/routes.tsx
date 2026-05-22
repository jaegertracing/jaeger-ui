// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';

// URL constants are tiny — import them eagerly so the route table can be built synchronously.
import { ROUTE_PATH as searchPath } from '../SearchTracePage/url';
import { ROUTE_PATH as tracePath } from '../TracePage/url';
import { ROUTE_PATH as dependenciesPath } from '../DependencyGraph/url';
import { ROUTE_PATH as deepDependenciesPath } from '../DeepDependencies/url';
import { ROUTE_PATH as qualityMetricsPath } from '../QualityMetrics/url';
import { ROUTE_PATH as monitorATMPath } from '../Monitor/url';
import { ROUTE_PATH as plexusDemoPath } from '../PlexusDemo/url';

// Route components are lazy-loaded so each page's module graph is only fetched
// when the user navigates to that route, not on initial app load.
const SearchTracePage = React.lazy(() => import('../SearchTracePage'));
const TraceRouter = React.lazy(() => import('./TraceRouter'));
const DependencyGraph = React.lazy(() => import('../DependencyGraph'));
const DeepDependencies = React.lazy(() => import('../DeepDependencies'));
const QualityMetrics = React.lazy(() => import('../QualityMetrics'));
const MonitorATMPage = React.lazy(() => import('../Monitor'));

// Only include the Plexus demo in development builds.
// Vite replaces import.meta.env.DEV with false in production, which causes Rollup
// to tree-shake the dynamic import and exclude the demo files from the prod bundle.
const PlexusDemoPage = import.meta.env.DEV ? React.lazy(() => import('../PlexusDemo')) : null;

const Fallback = <div />;

// The route table is exported so that index.test.ts can verify that
// KNOWN_SUB_PATHS covers every path registered here. The <Routes> in App/index.tsx is rendered
// directly from this array, so the two cannot diverge.
export const ROUTES: { path: string; element: React.ReactNode }[] = [
  {
    path: searchPath,
    element: (
      <React.Suspense fallback={Fallback}>
        <SearchTracePage />
      </React.Suspense>
    ),
  },
  {
    path: tracePath,
    element: (
      <React.Suspense fallback={Fallback}>
        <TraceRouter />
      </React.Suspense>
    ),
  },
  {
    path: dependenciesPath,
    element: (
      <React.Suspense fallback={Fallback}>
        <DependencyGraph />
      </React.Suspense>
    ),
  },
  {
    path: deepDependenciesPath,
    element: (
      <React.Suspense fallback={Fallback}>
        <DeepDependencies />
      </React.Suspense>
    ),
  },
  {
    path: qualityMetricsPath,
    element: (
      <React.Suspense fallback={Fallback}>
        <QualityMetrics />
      </React.Suspense>
    ),
  },
  {
    path: monitorATMPath,
    element: (
      <React.Suspense fallback={Fallback}>
        <MonitorATMPage />
      </React.Suspense>
    ),
  },
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
