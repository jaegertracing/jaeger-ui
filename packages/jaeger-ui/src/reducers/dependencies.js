// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { handleActions } from 'redux-actions';

import { fetchDependencies } from '../actions/jaeger-api';

const initialState = {
  dependencies: [],
  loading: false,
  error: null,
};

function fetchStarted(state) {
  return { ...state, loading: true };
}

function fetchDepsDone(state, { payload }) {
  return { ...state, dependencies: payload.data, loading: false };
}

function fetchDepsErred(state, { payload: error }) {
  return { ...state, error, dependencies: [], loading: false };
}

export default handleActions(
  {
    [`${fetchDependencies}_PENDING`]: fetchStarted,
    [`${fetchDependencies}_FULFILLED`]: fetchDepsDone,
    [`${fetchDependencies}_REJECTED`]: fetchDepsErred,
  },
  initialState
);
