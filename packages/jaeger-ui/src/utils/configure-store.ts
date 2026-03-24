// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createStore, combineReducers, applyMiddleware, compose, Store, StoreEnhancer } from 'redux';

import traceDiff from '../components/TraceDiff/duck';
import archive from '../components/TracePage/ArchiveNotifier/duck';
import traceTimeline from '../components/TracePage/TraceTimelineViewer/duck';
import jaegerReducers from '../reducers';
import * as jaegerMiddlewares from '../middlewares';
import { getAppEnvironment } from './constants';

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: () => StoreEnhancer;
  }
}

export default function configureStore(): Store<any> {
  const middlewares = [
    ...Object.keys(jaegerMiddlewares)
      .map(key => (jaegerMiddlewares as any)[key])
      .filter(Boolean),
  ];

  let enhancer: StoreEnhancer = applyMiddleware(...middlewares);

  if (getAppEnvironment() !== 'production' && window && window.__REDUX_DEVTOOLS_EXTENSION__) {
    enhancer = compose(enhancer, window.__REDUX_DEVTOOLS_EXTENSION__());
  }

  return createStore(
    combineReducers({
      ...jaegerReducers,
      archive,
      traceDiff,
      traceTimeline,
    }) as any,
    enhancer
  );
}

export const store = configureStore();
