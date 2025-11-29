// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

jest.mock(
  'node-fetch',
  () => () =>
    Promise.resolve({
      status: 200,
      data: () => Promise.resolve({ data: null }),
      json: () => Promise.resolve({ data: null }),
    })
);

import * as jaegerMiddlewares from './index';
import { fetchServiceOperations } from '../actions/jaeger-api';
import { CHANGE_SERVICE_ACTION_TYPE } from '../constants/search-form';

it('jaegerMiddlewares should contain the promise middleware', () => {
  expect(typeof jaegerMiddlewares.promise).toBe('function');
});

it('loadOperationsForServiceMiddleware fetches operations for services', () => {
  const { loadOperationsForServiceMiddleware } = jaegerMiddlewares;
  const dispatch = jest.fn();
  const next = jest.fn();
  const action = {
    type: CHANGE_SERVICE_ACTION_TYPE,
    payload: 'yo',
  };
  loadOperationsForServiceMiddleware({ dispatch })(next)(action);

  // Check that dispatch was called with the correct action structure
  expect(dispatch).toHaveBeenCalledTimes(1);
  const dispatchedAction = dispatch.mock.calls[0][0];
  expect(dispatchedAction.type).toBe('@JAEGER_API/FETCH_SERVICE_OPERATIONS');
  expect(dispatchedAction.meta).toEqual({ serviceName: 'yo' });
  expect(dispatchedAction.payload).toBeInstanceOf(Promise);

  expect(next).toHaveBeenCalledWith(action);
});
