// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import _isEqual from 'lodash/isEqual';
import { handleActions } from 'redux-actions';

import { searchTraces } from '../actions/jaeger-api';
import { loadJsonTraces } from '../actions/file-reader-api';
import { fetchedState } from '../constants';

type TraceState = {
  search: {
    query: any;
    results: string[];
    state?: string;
    error?: any;
  };
  rawTraces?: unknown[];
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
  const payloadData: any[] = payload.data;
  const results: string[] = payloadData.map(t => t.traceID).filter(Boolean);
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
    const payloadData: any[] = payload.data;
    if (!Array.isArray(payloadData) || payloadData.some(t => !Array.isArray(t.spans))) {
      throw new Error('Invalid trace data: missing or invalid spans');
    }
    const results = new Set(state.search.results);
    payloadData
      .map(t => t.traceID)
      .filter(Boolean)
      .forEach((id: string) => results.add(id));
    const search = { ...state.search, results: Array.from(results), state: fetchedState.DONE };
    return { ...state, search, rawTraces: payloadData };
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
