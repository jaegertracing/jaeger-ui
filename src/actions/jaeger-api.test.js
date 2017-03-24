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

import sinon from 'sinon';
import isPromise from 'is-promise';

import JaegerAPI from '../api/jaeger';

import * as jaegerApiActions from './jaeger-api';

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
