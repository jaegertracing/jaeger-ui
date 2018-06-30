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

import * as jaegerApiActions from '../actions/jaeger-api';
import { fetchedState } from '../constants';
import traceGenerator from '../demo/trace-generators';
import transformTraceData from '../model/transform-trace-data';
import traceReducer from '../reducers/trace';

const trace = traceGenerator.trace({ numberOfSpans: 1 });
const { traceID } = trace;

it('trace reducer should set loading true on a fetch', () => {
  const state = traceReducer(undefined, {
    type: `${jaegerApiActions.fetchTrace}_PENDING`,
    meta: { id: traceID },
  });
  const outcome = { [traceID]: { state: fetchedState.LOADING } };
  expect(state.traces).toEqual(outcome);
});

it('trace reducer should handle a successful FETCH_TRACE', () => {
  const state = traceReducer(undefined, {
    type: `${jaegerApiActions.fetchTrace}_FULFILLED`,
    payload: { data: [trace] },
    meta: { id: traceID },
  });
  expect(state.traces).toEqual({ [traceID]: { data: transformTraceData(trace), state: fetchedState.DONE } });
});

it('trace reducer should handle a failed FETCH_TRACE', () => {
  const error = new Error();
  const state = traceReducer(undefined, {
    type: `${jaegerApiActions.fetchTrace}_REJECTED`,
    payload: error,
    meta: { id: traceID },
  });
  expect(state.traces).toEqual({ [traceID]: { error, state: fetchedState.ERROR } });
  expect(state.traces[traceID].error).toBe(error);
});

it('trace reducer should handle a successful SEARCH_TRACES', () => {
  const state = traceReducer(undefined, {
    type: `${jaegerApiActions.searchTraces}_FULFILLED`,
    payload: { data: [trace] },
    meta: { query: 'whatever' },
  });
  const outcome = {
    traces: {
      [traceID]: {
        data: transformTraceData(trace),
        state: fetchedState.DONE,
      },
    },
    search: {
      state: fetchedState.DONE,
      results: [traceID],
    },
  };
  expect(state).toEqual(outcome);
});
