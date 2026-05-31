// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { handleActions } from 'redux-actions';

import { loadJsonTraces } from '../actions/file-reader-api';
import { fetchedState } from '../constants';

type TraceState = {
  search: {
    query: any;
    state?: string;
    error?: any;
  };
};

const initialState: TraceState = {
  search: {
    query: null,
  },
};

function loadJsonStarted(state: TraceState): TraceState {
  const { search } = state;
  return { ...state, search: { ...search, state: fetchedState.LOADING } };
}

function loadJsonDone(state: TraceState, { payload }: any): TraceState {
  try {
    const payloadData: any[] = payload.data;
    if (
      !Array.isArray(payloadData) ||
      payloadData.some(t => !t || typeof t !== 'object' || !Array.isArray(t.spans))
    ) {
      throw new Error('Invalid trace data: missing or invalid spans');
    }
    const search = { ...state.search, state: fetchedState.DONE };
    return { ...state, search };
  } catch (error) {
    const search = { ...state.search, error, state: fetchedState.ERROR };
    return { ...state, search };
  }
}

function loadJsonErred(state: TraceState, { payload }: any): TraceState {
  const search = { ...state.search, error: payload, state: fetchedState.ERROR };
  return { ...state, search };
}

export default handleActions(
  {
    [`${loadJsonTraces}_PENDING`]: loadJsonStarted,
    [`${loadJsonTraces}_FULFILLED`]: loadJsonDone,
    [`${loadJsonTraces}_REJECTED`]: loadJsonErred,
  },
  initialState
);
