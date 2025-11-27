// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import { createReduxHistoryContext } from 'redux-first-history';
import { createBrowserHistory } from 'history';

import traceDiff from '../components/TraceDiff/duck';
import archive from '../components/TracePage/ArchiveNotifier/duck';
import traceTimeline from '../components/TracePage/TraceTimelineViewer/duck';
import jaegerReducers from '../reducers';
import * as jaegerMiddlewares from '../middlewares';
import { getAppEnvironment } from './constants';

const { createReduxHistory, routerMiddleware, routerReducer } = createReduxHistoryContext({
  history: createBrowserHistory(),
});

export default function configureStore() {
  return createStore(
    combineReducers({
      ...jaegerReducers,
      archive,
      traceDiff,
      traceTimeline,
      router: routerReducer,
    }),
    compose(
      applyMiddleware(
        ...Object.keys(jaegerMiddlewares)
          .map(key => jaegerMiddlewares[key])
          .filter(Boolean),
        routerMiddleware
      ),
      getAppEnvironment() !== 'production' && window && window.__REDUX_DEVTOOLS_EXTENSION__
        ? window.__REDUX_DEVTOOLS_EXTENSION__()
        : noop => noop
    )
  );
}

export const store = configureStore();
export const history = createReduxHistory(store);
