// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Provider, type Store } from 'react-redux';
import { Route, Routes, Navigate } from 'react-router-dom';
import { AppQueryClientProvider } from '../../query/app-query-client';

import NotFound from './NotFound';
import { PageImpl as Page } from './Page';
import { ROUTE_PATH as searchPath } from '../SearchTracePage/url';
import { ROUTES } from './routes';
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

// Typed wrapper for Redux Provider to satisfy React 19's stricter types.
// The store is typed as Store<any> because the Redux reducers use legacy patterns.
// This wrapper avoids the need for `as any` cast on the store prop.
function TypedReduxProvider({ store, children }: { store: Store; children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}

export default function JaegerUIApp() {
  return (
    <AppQueryClientProvider>
      <ThemeProvider>
        <TypedReduxProvider store={store}>
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
        </TypedReduxProvider>
      </ThemeProvider>
    </AppQueryClientProvider>
  );
}
