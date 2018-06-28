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

import { handleActions } from 'redux-actions';

import { fetchTrace, searchTraces } from '../actions/jaeger-api';
import transformTraceData from '../model/transform-trace-data';

const initialState = {
  traces: {},
  loading: false,
  error: null,
  searchResults: [],
};

function fetchTraceStarted(state) {
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

function fetchSearchStarted(state) {
  return { ...state, loading: true, searchResults: [] };
}

function searchDone(state, { payload }) {
  const processed = payload.data.map(transformTraceData);
  const resultTraces = {};
  const searchResults = [];
  for (let i = 0; i < processed.length; i++) {
    const trace = processed[i];
    const traceID = trace.traceID;
    resultTraces[traceID] = trace;
    searchResults.push(traceID);
  }
  const traces = { ...state.traces, ...resultTraces };
  return { ...state, searchResults, traces, error: null, loading: false };
}

function searchErred(state, action) {
  const error = action.payload;
  const searchResults = [];
  return { ...state, error, searchResults, loading: false };
}

export default handleActions(
  {
    [`${fetchTrace}_PENDING`]: fetchTraceStarted,
    [`${fetchTrace}_FULFILLED`]: fetchTraceDone,
    [`${fetchTrace}_REJECTED`]: fetchTraceErred,

    [`${searchTraces}_PENDING`]: fetchSearchStarted,
    [`${searchTraces}_FULFILLED`]: searchDone,
    [`${searchTraces}_REJECTED`]: searchErred,
  },
  initialState
);
