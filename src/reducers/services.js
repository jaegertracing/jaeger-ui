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
import { handleActions } from 'redux-actions';

import * as jaegerApiActions from '../actions/jaeger-api';

export const initialState = Immutable.fromJS({
  services: [],
  operationsForService: {},
  loading: false,
  error: null,
});

export default handleActions(
  {
    [`${jaegerApiActions.fetchServices}_PENDING`]: state =>
      state.set('loading', true),
    [`${jaegerApiActions.fetchServices}_FULFILLED`]: (
      state,
      { payload: { data: services } }
    ) =>
      state
        .set('loading', false)
        .set('error', null)
        .set('services', Immutable.fromJS(services).sort()),
    [`${jaegerApiActions.fetchServices}_REJECTED`]: (
      state,
      { payload: error }
    ) =>
      state
        .set('services', Immutable.fromJS([]))
        .set('loading', false)
        .set('error', error.message),
    [`${jaegerApiActions.fetchServiceOperations}_PENDING`]: (
      state,
      { meta: { serviceName } }
    ) => state.setIn(['operationsForService', serviceName], Immutable.List()),
    [`${jaegerApiActions.fetchServiceOperations}_FULFILLED`]: (
      state,
      { meta: { serviceName }, payload: { data: operations } }
    ) =>
      state.setIn(
        ['operationsForService', serviceName],
        Immutable.List(operations)
      ),
  },
  initialState
);
