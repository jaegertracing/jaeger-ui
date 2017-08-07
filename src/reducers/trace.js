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

import keyBy from 'lodash/keyBy';
import { handleActions } from 'redux-actions';

import { fetchTrace, searchTraces } from '../actions/jaeger-api';
import { enforceUniqueSpanIds } from '../selectors/trace';

const initialState = {
  traces: {},
  loading: false,
  error: null,
};

function fetchStarted(state) {
  return { ...state, loading: true };
}

function fetchTraceDone(state, { meta, payload }) {
  const trace = enforceUniqueSpanIds(payload.data[0]);
  const traces = { ...state.traces, [meta.id]: trace };
  return { ...state, traces, loading: false };
}

function fetchTraceErred(state, { meta, payload }) {
  const traces = Object.assign({}, state.traces, { [meta.id]: payload });
  return { ...state, traces, loading: false };
}

function searchDone(state, { payload }) {
  const traces = keyBy(payload.data, 'traceID');
  return { ...state, traces, error: null, loading: false };
}

function searchErred(state, action) {
  const error = action.payload.message;
  return { ...state, error, loading: false, traces: [] };
}

export default handleActions(
  {
    [`${fetchTrace}_PENDING`]: fetchStarted,
    [`${fetchTrace}_FULFILLED`]: fetchTraceDone,
    [`${fetchTrace}_REJECTED`]: fetchTraceErred,

    [`${searchTraces}_PENDING`]: fetchStarted,
    [`${searchTraces}_FULFILLED`]: searchDone,
    [`${searchTraces}_REJECTED`]: searchErred,
  },
  initialState
);
