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

import keyBy from 'lodash/keyBy';
import { handleActions } from 'redux-actions';

import { fetchTrace, searchTraces } from '../actions/jaeger-api';
import transformTraceData from '../model/transform-trace-data';

const initialState = {
  traces: {},
  loading: false,
  error: null,
};

function fetchStarted(state) {
  return { ...state, loading: true };
}

function fetchTraceDone(state, { meta, payload }) {
  const trace = transformTraceData(payload.data[0]);
  let traces;
  if (!trace) {
    traces = { ...state.traces, [meta.id]: new Error('Invalid trace data recieved.') };
  } else {
    traces = { ...state.traces, [trace.traceID]: trace };
  }
  return { ...state, traces, loading: false };
}

function fetchTraceErred(state, { meta, payload }) {
  const traces = { ...state.traces, [meta.id]: payload };
  return { ...state, traces, loading: false };
}

function searchDone(state, { payload }) {
  const processed = payload.data.map(transformTraceData);
  const traces = keyBy(processed, 'traceID');
  return { ...state, traces, error: null, loading: false };
}

function searchErred(state, action) {
  const error = action.payload;
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
