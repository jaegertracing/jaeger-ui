// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import promiseMiddleware from 'redux-promise-middleware';
import { replace } from 'redux-first-history';
import { Middleware } from 'redux';

import { searchTraces, fetchServiceOperations } from '../actions/jaeger-api';
import { getUrl as getSearchUrl } from '../components/SearchTracePage/url';
import { CHANGE_SERVICE_ACTION_TYPE } from '../constants/search-form';
import { ReduxState } from '../types';

export { default as trackMiddleware } from './track';

/**
 * Middleware to load "operations" for a particular service.
 */
export const loadOperationsForServiceMiddleware: Middleware<{}, ReduxState> =
  store => next => (action: any) => {
    if (action.type === CHANGE_SERVICE_ACTION_TYPE && action.payload !== '-') {
      store.dispatch(fetchServiceOperations(action.payload) as any);
    }
    return next(action);
  };

export const historyUpdateMiddleware: Middleware<{}, ReduxState> = store => next => (action: any) => {
  if (action.type === String(searchTraces)) {
    const url = getSearchUrl(action.meta.query);
    store.dispatch(replace(url));
  }
  return next(action);
};

export const promise = promiseMiddleware;
