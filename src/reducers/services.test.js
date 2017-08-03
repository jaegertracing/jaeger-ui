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

import Immutable from 'immutable';

import * as jaegerApiActions from '../../src/actions/jaeger-api';
import serviceReducer, { initialState as servicesInitialState } from '../../src/reducers/services';

it('should initialize an empty services array', () => {
  expect(
    Immutable.is(
      serviceReducer(servicesInitialState, {}),
      Immutable.fromJS({
        services: [],
        loading: false,
        error: null,
        operationsForService: {},
      })
    )
  ).toBeTruthy();
});

it('should handle a fetch services with loading state', () => {
  expect(
    Immutable.is(
      serviceReducer(servicesInitialState, {
        type: `${jaegerApiActions.fetchServices}_PENDING`,
      }),
      Immutable.fromJS({
        services: [],
        operationsForService: {},
        loading: true,
        error: null,
      })
    )
  ).toBeTruthy();
});

it('should handle successful services fetch', () => {
  expect(
    Immutable.is(
      serviceReducer(servicesInitialState, {
        type: `${jaegerApiActions.fetchServices}_FULFILLED`,
        payload: { data: ['a', 'b', 'c'] },
      }),
      Immutable.fromJS({
        services: ['a', 'b', 'c'],
        operationsForService: {},
        loading: false,
        error: null,
      })
    )
  ).toBeTruthy();
});

it('should handle a failed services fetch', () => {
  expect(
    Immutable.is(
      serviceReducer(servicesInitialState, {
        type: `${jaegerApiActions.fetchServices}_REJECTED`,
        payload: new Error('Error'),
      }),
      Immutable.fromJS({
        services: [],
        operationsForService: {},
        loading: false,
        error: 'Error',
      })
    )
  ).toBeTruthy();
});

it('should handle a successful fetching operations for a service ', () => {
  expect(
    Immutable.is(
      serviceReducer(servicesInitialState, {
        type: `${jaegerApiActions.fetchServiceOperations}_FULFILLED`,
        meta: { serviceName: 'serviceA' },
        payload: { data: ['a', 'b'] },
      }),
      Immutable.fromJS({
        services: [],
        operationsForService: {
          serviceA: ['a', 'b'],
        },
        loading: false,
        error: null,
      })
    )
  ).toBeTruthy();
});
