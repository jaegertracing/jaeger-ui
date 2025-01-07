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
import React, { Component } from 'react';
import { Provider } from 'react-redux';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { defaultTheme } from '@ant-design/compatible';
import NotFound from './NotFound';
import Page from './Page';
import DependencyGraph from '../DependencyGraph';
import DeepDependencies from '../DeepDependencies';
import QualityMetrics from '../QualityMetrics';
import SearchTracePage from '../SearchTracePage';
import TraceDiff from '../TraceDiff';
import TracePage from '../TracePage';
import MonitorATMPage from '../Monitor';
import JaegerAPI, { DEFAULT_API_ROOT } from '../../api/jaeger';
import processScripts from '../../utils/config/process-scripts';
import prefixUrl from '../../utils/prefix-url';
import { store } from '../../utils/configure-store';

import '../common/vars.css';
import '../common/utils.css';
import 'antd/dist/reset.css';
import './index.css';

const jaegerTheme = {
  token: {
    ...defaultTheme.token,
    colorPrimary: '#199',
  },
  components: {
    ...defaultTheme.components,
    Layout: {
      ...defaultTheme.components.Layout,
      bodyBg: '#fff',
      headerBg: '#404040',
      footerBg: '#fff',
      headerHeight: 48,
      headerPadding: '0 50',
      footerPadding: '24 50',
      siderBg: '#404040',
      triggerHeight: 48,
      triggerBg: 'tint(#fff, 20%)',
      zeroTriggerWidth: 36,
      zeroTriggerHeight: 42,
    },
    Menu: {
      ...defaultTheme.components.Menu,
      darkItemBg: '#151515',
    },
    Table: {
      ...defaultTheme.components.Table,
      rowHoverBg: '#e5f2f2',
    },
  },
};

export default class JaegerUIApp extends Component {
  constructor(props) {
    super(props);
    JaegerAPI.apiRoot = DEFAULT_API_ROOT;
    processScripts();
  }

  render() {
    return (
      <ConfigProvider theme={jaegerTheme}>
        <Provider store={store}>
            <Page>
              <Routes>
                <Route path="/search" element={<SearchTracePage />} />
                <Route path="/tracediff" element={<TraceDiff />} />
                <Route path="/trace" element={<TracePage />} />
                <Route path="/dependencies" element={<DependencyGraph />} />
                <Route path="/deep-dependencies" element={<DeepDependencies />} />
                <Route path="/quality-metrics" element={<QualityMetrics />} />
                <Route path="/monitor-atm" element={<MonitorATMPage />} />
                <Route path="/" element={<Navigate to="/search" replace />} />
                <Route path={prefixUrl()} element={<Navigate to="/search" replace />} />
                <Route path={prefixUrl('/')} element={<Navigate to="/search" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Page>
        </Provider>
      </ConfigProvider>
    );
  }
}
