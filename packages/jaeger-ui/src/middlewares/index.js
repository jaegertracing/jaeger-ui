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

import promiseMiddleware from 'redux-promise-middleware';
import { change } from 'redux-form';
import { replace } from 'redux-first-history';

import { searchTraces, fetchServiceOperations } from '../actions/jaeger-api';
import { loadJsonTraces } from '../actions/file-reader-api';
import { getUrl as getSearchUrl } from '../components/SearchTracePage/url';
import JaegerAPI from '../api/jaeger';

export { default as trackMiddleware } from './track';

/**
 * Middleware to load "operations" for a particular service.
 */
export const loadOperationsForServiceMiddleware = store => next => action => {
  if (
    action.type === '@@redux-form/CHANGE' &&
    action.meta.form === 'searchSideBar' &&
    action.meta.field === 'service' &&
    action.payload !== '-'
  ) {
    store.dispatch(fetchServiceOperations(action.payload));
    store.dispatch(change('searchSideBar', 'operation', 'all'));
  }
  return next(action);
};

export const historyUpdateMiddleware = store => next => action => {
  if (action.type === String(searchTraces)) {
    const url = getSearchUrl(action.meta.query);
    store.dispatch(replace(url));
  }
  return next(action);
};

export const loadJsonTracesMiddleware = store => next => action => {
  if (action.type === String([`${loadJsonTraces}_FULFILLED`])) {
    // Check if action.payload is OTLP and make API call if so
    // We are allowed to change the action.payload here
    //
    if ('resourceSpans' in action.payload) {
      JaegerAPI.transformOTLP(action.payload)
        .then(result => {
          const transformedAction = {
            ...action,
            payload: result,
          };
          return next(transformedAction);
        })
        .catch(() => {
          return next(action);
        });
    } else {
      return next(action);
    }
  } else {
    return next(action);
  }
  return next(action); // Consistent returns
};

export const promise = promiseMiddleware;
