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

import { handleActions } from 'redux-actions';

import { fetchConfig } from '../actions/jaeger-api';
import defaultConfig from '../constants/default-config';

const initialState = {
  data: {},
  loading: false,
  error: null,
};

function fetchStarted(state) {
  return { ...state, loading: true };
}

function fetchDone(state, { payload }) {
  const data = payload;
  // fetchConfig action creator is set to handle rejected promises
  if (data.error) {
    const { message, stack } = data.error;
    return { ...state, error: { message, stack }, loading: false, data: defaultConfig };
  }
  return { ...state, data, error: null, loading: false };
}

function fetchErred(state, { payload: error }) {
  return { ...state, error: error.message, loading: false, data: defaultConfig };
}

export default handleActions(
  {
    [`${fetchConfig}_PENDING`]: fetchStarted,
    [`${fetchConfig}_FULFILLED`]: fetchDone,
    [`${fetchConfig}_REJECTED`]: fetchErred,
  },
  initialState
);
