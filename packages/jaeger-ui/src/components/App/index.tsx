// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Provider } from 'react-redux';
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
