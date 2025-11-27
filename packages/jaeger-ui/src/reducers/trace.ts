// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import _isEqual from 'lodash/isEqual';
import { handleActions } from 'redux-actions';

import { fetchTrace, fetchMultipleTraces, searchTraces } from '../actions/jaeger-api';
import { loadJsonTraces } from '../actions/file-reader-api';
import { fetchedState } from '../constants';
import transformTraceData from '../model/transform-trace-data';

type TraceState = {
  traces: Record<string, any>;
  search: {
    query: any;
    results: string[];
    state?: string;
    error?: any;
  };
  rawTraces?: any[];
};

const initialState: TraceState = {
  traces: {},
  search: {
    query: null,
    results: [],
  },
};

function fetchTraceStarted(state: TraceState, { meta }: any): TraceState {
  const { id } = meta;
  const traces = { ...state.traces, [id]: { id, state: fetchedState.LOADING } };
  return { ...state, traces };
}

function fetchTraceDone(state: TraceState, { meta, payload }: any): TraceState {
  const { id } = meta;
  const data = transformTraceData(payload.data[0]);
  let trace: any;
  if (!data) {
    trace = { id, state: fetchedState.ERROR, error: new Error('Invalid trace data recieved.') };
  } else {
    trace = { data, id, state: fetchedState.DONE };
  }
  const traces = { ...state.traces, [id]: trace };
  return { ...state, traces };
}

function fetchTraceErred(state: TraceState, { meta, payload }: any): TraceState {
  const { id } = meta;
  const trace = { id, error: payload, state: fetchedState.ERROR };
  const traces = { ...state.traces, [id]: trace };
  return { ...state, traces };
}

function fetchMultipleTracesStarted(state: TraceState, { meta }: any): TraceState {
  const { ids } = meta;
  const traces = { ...state.traces };
  ids.forEach((id: string) => {
    traces[id] = { id, state: fetchedState.LOADING };
  });
  return { ...state, traces };
}

function fetchMultipleTracesDone(state: TraceState, { payload }: any): TraceState {
  const traces = { ...state.traces };
  payload.data.forEach((raw: any) => {
    const data = transformTraceData(raw);
    if (data) {
      traces[data.traceID] = { data, id: data.traceID, state: fetchedState.DONE };
    }
  });
  if (payload.errors) {
    payload.errors.forEach((err: any) => {
      const { msg, traceID } = err;
      const error = new Error(`Error: ${msg} - ${traceID}`);
      traces[traceID] = { error, id: traceID, state: fetchedState.ERROR };
    });
  }
  return { ...state, traces };
}

function fetchMultipleTracesErred(state: TraceState, { meta, payload }: any): TraceState {
  const { ids } = meta;
  const traces = { ...state.traces };
  const error = payload;
  ids.forEach((id: string) => {
    traces[id] = { error, id, state: fetchedState.ERROR };
  });
  return { ...state, traces };
}

function fetchSearchStarted(state: TraceState, { meta }: any): TraceState {
  const { query } = meta;
  const search = {
    query,
    results: [],
    state: fetchedState.LOADING,
  };
  return { ...state, search };
}

function searchDone(state: TraceState, { meta, payload }: any): TraceState {
  if (!_isEqual(state.search.query, meta.query)) {
    return state;
  }
  const payloadData = payload.data;
  const processed = payloadData.map(transformTraceData);
  const resultTraces: Record<string, any> = {};
  const results: string[] = [];
  for (let i = 0; i < processed.length; i++) {
    const data = processed[i];
    const id = data.traceID;
    resultTraces[id] = { data, id, state: fetchedState.DONE };
    results.push(id);
  }
  const traces = { ...state.traces, ...resultTraces };
  const search = { ...state.search, results, state: fetchedState.DONE };
  return { ...state, search, traces, rawTraces: payloadData };
}

function searchErred(state: TraceState, { meta, payload }: any): TraceState {
  if (!_isEqual(state.search.query, meta.query)) {
    return state;
  }
  const search = { ...state.search, error: payload, results: [], state: fetchedState.ERROR };
  return { ...state, search };
}

function loadJsonStarted(state: TraceState): TraceState {
  const { search } = state;
  return { ...state, search: { ...search, state: fetchedState.LOADING } };
}

function loadJsonDone(state: TraceState, { payload }: any): TraceState {
  try {
    const processed = payload.data.map(transformTraceData);
    const resultTraces: Record<string, any> = {};
    const results = new Set(state.search.results);
    for (let i = 0; i < processed.length; i++) {
      const data = processed[i];
      const id = data.traceID;
      resultTraces[id] = { data, id, state: fetchedState.DONE };
      results.add(id);
    }
    const traces = { ...state.traces, ...resultTraces };
    const search = { ...state.search, results: Array.from(results), state: fetchedState.DONE };
    return { ...state, search, traces };
  } catch (error) {
    const search = { ...state.search, error, results: [], state: fetchedState.ERROR };
    return { ...state, search };
  }
}

function loadJsonErred(state: TraceState, { payload }: any): TraceState {
  const search = { ...state.search, error: payload, results: [], state: fetchedState.ERROR };
  return { ...state, search };
}

export default handleActions(
  {
    [`${fetchTrace}_PENDING`]: fetchTraceStarted,
    [`${fetchTrace}_FULFILLED`]: fetchTraceDone,
    [`${fetchTrace}_REJECTED`]: fetchTraceErred,

    [`${fetchMultipleTraces}_PENDING`]: fetchMultipleTracesStarted,
    [`${fetchMultipleTraces}_FULFILLED`]: fetchMultipleTracesDone,
    [`${fetchMultipleTraces}_REJECTED`]: fetchMultipleTracesErred,

    [`${searchTraces}_PENDING`]: fetchSearchStarted,
    [`${searchTraces}_FULFILLED`]: searchDone,
    [`${searchTraces}_REJECTED`]: searchErred,

    [`${loadJsonTraces}_PENDING`]: loadJsonStarted,
    [`${loadJsonTraces}_FULFILLED`]: loadJsonDone,
    [`${loadJsonTraces}_REJECTED`]: loadJsonErred,
  },
  initialState
);
