import PropTypes from 'prop-types';
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

import React, { Component } from 'react';
import { Provider } from 'react-redux';
import { Router, Route, IndexRedirect, browserHistory } from 'react-router';
import { syncHistoryWithStore } from 'react-router-redux';
import { metrics } from 'react-metrics';

import 'semantic-ui-css/semantic.min.css';
import './App.css';

import configureStore from '../../utils/configure-store';
import JaegerAPI, { DEFAULT_API_ROOT } from '../../api/jaeger';

import Page from './Page';
import NotFound from './NotFound';
import { ConnectedTracePage } from '../TracePage';
import { ConnectedSearchTracePage } from '../SearchTracePage';
import { ConnectedDependencyGraphPage } from '../DependencyGraph';
import metricConfig from '../../utils/metrics';

const PageWithMetrics = metrics(metricConfig)(Page);

export default class JaegerUIApp extends Component {
  static get propTypes() {
    return {
      history: Router.propTypes.history,
      apiRoot: PropTypes.string,
    };
  }

  static get defaultProps() {
    return {
      history: browserHistory,
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
        <Router history={syncHistoryWithStore(history, store)}>
          <Route path="/" component={PageWithMetrics}>
            <Route path="/search" component={ConnectedSearchTracePage} />
            <Route path="/trace/:id" component={ConnectedTracePage} />
            <Route
              path="/dependencies"
              component={ConnectedDependencyGraphPage}
            />
            <Route path="*" component={NotFound} />
            <IndexRedirect to="/search" />
          </Route>
        </Router>
      </Provider>
    );
  }
}
