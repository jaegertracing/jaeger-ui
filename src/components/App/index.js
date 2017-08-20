// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Provider } from 'react-redux';
import { Route, Redirect, Switch } from 'react-router-dom';
import createHistory from 'history/createBrowserHistory';
import { ConnectedRouter } from 'react-router-redux';
import { metrics } from 'react-metrics';

import 'semantic-ui-css/semantic.min.css';

import configureStore from '../../utils/configure-store';
import JaegerAPI, { DEFAULT_API_ROOT } from '../../api/jaeger';

import Page from './Page';
import NotFound from './NotFound';
import { ConnectedTracePage } from '../TracePage';
import { ConnectedSearchTracePage } from '../SearchTracePage';
import { ConnectedDependencyGraphPage } from '../DependencyGraph';
import metricConfig from '../../utils/metrics';

import './App.css';

const PageWithMetrics = metrics(metricConfig)(Page);

const defaultHistory = createHistory();

export default class JaegerUIApp extends Component {
  static get propTypes() {
    return {
      history: PropTypes.object,
      apiRoot: PropTypes.string,
    };
  }

  static get defaultProps() {
    return {
      history: defaultHistory,
      apiRoot: DEFAULT_API_ROOT,
    };
  }

  componentDidMount() {
    const { apiRoot } = this.props;
    JaegerAPI.apiRoot = apiRoot;
  }

  render() {
    const { history } = this.props;
    const store = configureStore(history);

    return (
      <Provider store={store}>
        <ConnectedRouter history={history}>
          <PageWithMetrics>
            <Switch>
              <Route path="/search" component={ConnectedSearchTracePage} />
              <Route path="/trace/:id" component={ConnectedTracePage} />
              <Route path="/dependencies" component={ConnectedDependencyGraphPage} />
              <Redirect exact path="/" to="/search" />
              <Route path="*" component={NotFound} />
            </Switch>
          </PageWithMetrics>
        </ConnectedRouter>
      </Provider>
    );
  }
}
