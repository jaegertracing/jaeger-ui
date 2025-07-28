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
  expect(dispatch).toHaveBeenCalledWith(fetchServiceOperations('yo'));
  expect(next).toHaveBeenCalledWith(action);
});
