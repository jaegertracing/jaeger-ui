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
