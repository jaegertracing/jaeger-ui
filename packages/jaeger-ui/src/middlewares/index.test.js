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

/* eslint-disable import/first */
jest.mock(
  'node-fetch',
  () => () =>
    Promise.resolve({
      status: 200,
      data: () => Promise.resolve({ data: null }),
      json: () => Promise.resolve({ data: null }),
    })
);

import { change } from 'redux-form';
import fs from 'fs';
import _ from 'lodash';
import * as jaegerMiddlewares from './index';
import { fetchServiceOperations } from '../actions/jaeger-api';
import { loadJsonTraces } from '../actions/file-reader-api';
import JaegerAPI from '../api/jaeger';

jest.spyOn(JaegerAPI, 'transformOTLP').mockImplementation(APICallRequest => {
  const OTLPTrace = JSON.parse(fs.readFileSync('src/middlewares/fixtures/otlp2jaeger-in.json', 'utf-8'));
  const jaegerTrace = JSON.parse(fs.readFileSync('src/middlewares/fixtures/otlp2jaeger-out.json', 'utf-8'));
  if (_.isEqual(APICallRequest, OTLPTrace)) {
    return Promise.resolve(jaegerTrace);
  }
  // This defines case where API call errors out even after detecting a `resourceSpan` in the request:
  return Promise.reject();
});

it('jaegerMiddlewares should contain the promise middleware', () => {
  expect(typeof jaegerMiddlewares.promise).toBe('function');
});

it('loadOperationsForServiceMiddleware fetches operations for services', () => {
  const { loadOperationsForServiceMiddleware } = jaegerMiddlewares;
  const dispatch = jest.fn();
  const next = jest.fn();
  const action = change('searchSideBar', 'service', 'yo');
  loadOperationsForServiceMiddleware({ dispatch })(next)(action);
  expect(dispatch).toHaveBeenCalledWith(fetchServiceOperations('yo'));
  expect(dispatch).toHaveBeenCalledWith(change('searchSideBar', 'operation', 'all'));
});

it('loadJsonTracesMiddleware transformes traces from OTLP to jaeger by making an API call', async () => {
  // Testing 3 paths in all :
  // OTLP traces
  // Jaeger traces
  // Ivalid traces
  const { loadJsonTracesMiddleware } = jaegerMiddlewares;
  const dispatch = jest.fn();
  const next = jest.fn();

  const OTLPFileAction = {
    type: String([`${loadJsonTraces}_FULFILLED`]),
    payload: JSON.parse(fs.readFileSync('src/middlewares/fixtures/otlp2jaeger-in.json', 'utf-8')),
  };

  const JaegerAction = {
    type: String([`${loadJsonTraces}_FULFILLED`]),
    payload: JSON.parse(fs.readFileSync('src/middlewares/fixtures/otlp2jaeger-out.json', 'utf-8')),
  };

  await loadJsonTracesMiddleware({ dispatch })(next)(OTLPFileAction);
  expect(JaegerAPI.transformOTLP).toHaveBeenCalledWith(OTLPFileAction.payload);
  expect(next).toHaveBeenCalledWith(JaegerAction);
  jest.clearAllMocks();
  await loadJsonTracesMiddleware({ dispatch })(next)(JaegerAction);
  expect(JaegerAPI.transformOTLP).not.toHaveBeenCalled();
  expect(next).toHaveBeenCalledWith(JaegerAction);
  // Errored JSON are caught before any redux action is invoked
});
