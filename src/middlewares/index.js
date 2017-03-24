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

import promiseMiddleware from 'redux-promise-middleware';
import queryString from 'query-string';
import { change } from 'redux-form';
import { replace } from 'react-router-redux';

import { searchTraces, fetchServiceOperations } from '../actions/jaeger-api';

/**
 * Middleware to load "operations" for a particular service.
 */
export const loadOperationsForServiceMiddleware = store =>
  next =>
    action => {
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

export const historyUpdateMiddleware = store =>
  next =>
    action => {
      switch (action.type) {
        case `${searchTraces}`: {
          store.dispatch(
            replace(`/search?${queryString.stringify(action.meta.query)}`)
          );
          break;
        }
        default:
          break;
      }

      next(action);
    };

export const promise = promiseMiddleware();
