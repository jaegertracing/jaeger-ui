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
import { enforceUniqueSpanIds } from '../selectors/trace';

export const initialState = Immutable.Map({
  traces: Immutable.Map(),
  loading: false,
  error: null,
});

export default handleActions(
  {
    [`${jaegerApiActions.fetchTrace}_PENDING`]: state => state.set('loading', true),
    [`${jaegerApiActions.fetchTrace}_FULFILLED`]: (state, { meta: { id }, payload: { data: traces } }) =>
      state.set('loading', false).setIn(['traces', id], Immutable.fromJS(enforceUniqueSpanIds(traces[0]))),
    [`${jaegerApiActions.fetchTrace}_REJECTED`]: (state, { meta: { id }, payload: error }) =>
      state.set('loading', false).setIn(['traces', id], error),
    [`${jaegerApiActions.searchTraces}_PENDING`]: state => state.set('loading', true),
    [`${jaegerApiActions.searchTraces}_FULFILLED`]: (state, action) => {
      const traceResults = {};
      action.payload.data.forEach(trace => {
        traceResults[trace.traceID] = trace;
      });
      return state.set('traces', Immutable.fromJS(traceResults)).set('loading', false).set('error', null);
    },
    [`${jaegerApiActions.searchTraces}_REJECTED`]: (state, action) =>
      state.set('traces', Immutable.fromJS([])).set('loading', false).set('error', action.payload.message),
  },
  initialState
);
