// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import promiseMiddleware from 'redux-promise-middleware';
import { replace } from 'redux-first-history';
import { Middleware } from 'redux';

import { searchTraces } from '../actions/jaeger-api';
import { getUrl as getSearchUrl } from '../components/SearchTracePage/url';
import { ReduxState } from '../types';

export { default as trackMiddleware } from './track';

export const historyUpdateMiddleware: Middleware<{}, ReduxState> = store => next => (action: any) => {
  if (action.type === String(searchTraces)) {
    const url = getSearchUrl(action.meta.query);
    store.dispatch(replace(url));
  }
  return next(action);
};

export const promise = promiseMiddleware;
