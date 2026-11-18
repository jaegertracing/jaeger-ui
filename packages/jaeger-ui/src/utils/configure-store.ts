// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createStore, applyMiddleware, compose, Store, StoreEnhancer } from 'redux';

import * as jaegerMiddlewares from '../middlewares';
import { getAppEnvironment } from './constants';

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: () => StoreEnhancer;
  }
}

export default function configureStore(): Store<any> {
  const middlewares = Object.keys(jaegerMiddlewares)
    .map(key => (jaegerMiddlewares as any)[key])
    .filter(Boolean);

  let enhancer: StoreEnhancer = applyMiddleware(...middlewares);

  if (getAppEnvironment() !== 'production' && window && window.__REDUX_DEVTOOLS_EXTENSION__) {
    enhancer = compose(enhancer, window.__REDUX_DEVTOOLS_EXTENSION__());
  }

  // No slice keeps state in Redux; the store remains only until <Provider> is removed. An identity
  // reducer avoids combineReducers' empty-map warning.
  return createStore((state: object = {}) => state, enhancer);
}

export const store = configureStore();
