// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import _isEqual from 'lodash/isEqual';
import { handleActions } from 'redux-actions';

import { searchTraces } from '../actions/jaeger-api';
import { loadJsonTraces } from '../actions/file-reader-api';
import { fetchedState } from '../constants';
import transformTraceData from '../model/transform-trace-data';

type TraceState = {
  search: {
    query: any;
    results: string[];
    state?: string;
    error?: any;
  };
  rawTraces?: any[];
};

const initialState: TraceState = {
  search: {
    query: null,
    results: [],
  },
};

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
  const results: string[] = [];
  for (let i = 0; i < processed.length; i++) {
    const data = processed[i];
    results.push(data.traceID);
  }
  const search = { ...state.search, results, state: fetchedState.DONE };
  return { ...state, search, rawTraces: payloadData };
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
    const results = new Set(state.search.results);
    for (let i = 0; i < processed.length; i++) {
      const data = processed[i];
      results.add(data.traceID);
    }
    const search = { ...state.search, results: Array.from(results), state: fetchedState.DONE };
    return { ...state, search };
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
    [`${searchTraces}_PENDING`]: fetchSearchStarted,
    [`${searchTraces}_FULFILLED`]: searchDone,
    [`${searchTraces}_REJECTED`]: searchErred,

    [`${loadJsonTraces}_PENDING`]: loadJsonStarted,
    [`${loadJsonTraces}_FULFILLED`]: loadJsonDone,
    [`${loadJsonTraces}_REJECTED`]: loadJsonErred,
  },
  initialState
);
