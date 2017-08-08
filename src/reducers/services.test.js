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

import { fetchServices, fetchServiceOperations } from '../../src/actions/jaeger-api';
import serviceReducer from '../../src/reducers/services';

const initialState = serviceReducer(undefined, {});

function verifyInitialState() {
  expect(initialState).toEqual({
    services: [],
    loading: false,
    error: null,
    operationsForService: {},
  });
}

beforeEach(verifyInitialState);
afterEach(verifyInitialState);

it('should handle a fetch services with loading state', () => {
  const state = serviceReducer(initialState, {
    type: `${fetchServices}_PENDING`,
  });
  expect(state).toEqual({
    services: [],
    operationsForService: {},
    loading: true,
    error: null,
  });
});

it('should handle successful services fetch', () => {
  const services = ['a', 'b', 'c'];
  const state = serviceReducer(initialState, {
    type: `${fetchServices}_FULFILLED`,
    payload: { data: services.slice() },
  });
  expect(state).toEqual({
    services,
    operationsForService: {},
    loading: false,
    error: null,
  });
});

it('should handle a failed services fetch', () => {
  const error = new Error('some-message');
  const state = serviceReducer(initialState, {
    type: `${fetchServices}_REJECTED`,
    payload: error,
  });
  expect(state).toEqual({
    services: [],
    operationsForService: {},
    loading: false,
    error: error.message,
  });
});

it('should handle a successful fetching operations for a service ', () => {
  const ops = ['a', 'b'];
  const state = serviceReducer(initialState, {
    type: `${fetchServiceOperations}_FULFILLED`,
    meta: { serviceName: 'serviceA' },
    payload: { data: ops.slice() },
  });
  expect(state).toEqual({
    services: [],
    operationsForService: {
      serviceA: ops,
    },
    loading: false,
    error: null,
  });
});
