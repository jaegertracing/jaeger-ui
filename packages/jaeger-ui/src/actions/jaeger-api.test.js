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
jest.mock('node-fetch', () => () =>
  Promise.resolve({
    status: 200,
    data: () => Promise.resolve({ data: null }),
    json: () => Promise.resolve({ data: null }),
  })
);

import sinon from 'sinon';
import isPromise from 'is-promise';

import * as jaegerApiActions from './jaeger-api';
import JaegerAPI from '../api/jaeger';

it('@JAEGER_API/FETCH_TRACE should fetch the trace by id', () => {
  const api = JaegerAPI;
  const id = 'my-trace-id';
  const mock = sinon.mock(api);

  mock.expects('fetchTrace').withExactArgs(id);
  jaegerApiActions.fetchTrace(id);
  expect(() => mock.verify()).not.toThrow();

  mock.restore();
});

it('@JAEGER_API/FETCH_TRACE should return the promise', () => {
  const api = JaegerAPI;
  const id = 'my-trace-id';
  const mock = sinon.mock(api);

  const { payload } = jaegerApiActions.fetchTrace(id);
  expect(isPromise(payload)).toBeTruthy();

  mock.restore();
});

it('@JAEGER_API/FETCH_TRACE should attach the id as meta', () => {
  const api = JaegerAPI;
  const id = 'my-trace-id';
  const mock = sinon.mock(api);

  const { meta } = jaegerApiActions.fetchTrace(id);
  expect(meta.id).toBe(id);

  mock.restore();
});

it('@JAEGER_API/SEARCH_TRACES should fetch the trace by id', () => {
  const api = JaegerAPI;
  const query = { service: 's', limit: 1 };
  const mock = sinon.mock(api);

  mock.expects('searchTraces').withExactArgs(query);
  jaegerApiActions.searchTraces(query);
  expect(() => mock.verify()).not.toThrow();

  mock.restore();
});

it('@JAEGER_API/SEARCH_TRACES should return the promise', () => {
  const api = JaegerAPI;
  const query = { myQuery: 'whatever' };
  const mock = sinon.mock(api);

  const { payload } = jaegerApiActions.searchTraces(query);
  expect(isPromise(payload)).toBeTruthy();

  mock.restore();
});

it('@JAEGER_API/SEARCH_TRACES should attach the query as meta', () => {
  const api = JaegerAPI;
  const query = { myQuery: 'whatever' };
  const mock = sinon.mock(api);

  const { meta } = jaegerApiActions.searchTraces(query);
  expect(meta.query).toEqual(query);

  mock.restore();
});

it('@JAEGER_API/FETCH_SERVICES should return a promise', () => {
  const api = JaegerAPI;
  const mock = sinon.mock(api);
  const { payload } = jaegerApiActions.fetchServices();
  expect(isPromise(payload)).toBeTruthy();
  mock.restore();
});

it('@JAEGER_API/FETCH_SERVICE_OPERATIONS should call the JaegerAPI', () => {
  const api = JaegerAPI;
  const mock = sinon.mock(api);
  const called = mock
    .expects('fetchServiceOperations')
    .once()
    .withExactArgs('service');
  jaegerApiActions.fetchServiceOperations('service');
  expect(called.verify()).toBeTruthy();
  mock.restore();
});
