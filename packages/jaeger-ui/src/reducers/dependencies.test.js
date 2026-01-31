// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fetchDependencies } from '../actions/jaeger-api';
import reducer from './dependencies';

const initialState = reducer(undefined, {});

function verifyInitialState() {
  expect(initialState).toEqual({
    dependencies: [],
    loading: false,
    error: null,
  });
}

beforeEach(verifyInitialState);
afterEach(verifyInitialState);

it('sets loading to true when fetching dependencies is pending', () => {
  const state = reducer(initialState, {
    type: `${fetchDependencies}_PENDING`,
  });
  expect(state.loading).toBe(true);
});

it('handles a successful dependencies fetch', () => {
  const deps = ['a', 'b', 'c'];
  const state = reducer(initialState, {
    type: `${fetchDependencies}_FULFILLED`,
    payload: { data: deps.slice() },
  });
  expect(state.loading).toBe(false);
  expect(state.dependencies).toEqual(deps);
});

it('handles a failed dependencies fetch', () => {
  const error = new Error('some-message');
  const state = reducer(initialState, {
    type: `${fetchDependencies}_REJECTED`,
    payload: error,
  });
  expect(state.loading).toBe(false);
  expect(state.dependencies).toEqual([]);
  expect(state.error).toBe(error);
});
