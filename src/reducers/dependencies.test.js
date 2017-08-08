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

import { fetchDependencies } from '../actions/jaeger-api';
import reducer from '../../src/reducers/dependencies';

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
