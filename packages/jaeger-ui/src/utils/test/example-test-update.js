// Copyright (c) 2023 The Jaeger Authors.
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

// This is an example of how to update an existing test to use the state factory

// BEFORE:
// import * as jaegerApiActions from '../actions/jaeger-api';
// import { fetchedState } from '../constants';
// import traceGenerator from '../demo/trace-generators';
// import transformTraceData from '../model/transform-trace-data';
// import traceReducer from './trace';

// const trace = traceGenerator.trace({ numberOfSpans: 1 });
// const { traceID: id } = trace;

// it('handles a successful FETCH_TRACE', () => {
//   const state = traceReducer(undefined, {
//     type: `${jaegerApiActions.fetchTrace}_FULFILLED`,
//     payload: { data: [trace] },
//     meta: { id },
//   });
//   expect(state.traces).toEqual({ [id]: { id, data: transformTraceData(trace), state: fetchedState.DONE } });
// });

// AFTER:
import * as jaegerApiActions from '../actions/jaeger-api';
import { fetchedState } from '../constants';
import traceGenerator from '../demo/trace-generators';
import transformTraceData from '../model/transform-trace-data';
import traceReducer from './trace';
import { createTrace, createTraceState } from '../utils/test';

const trace = traceGenerator.trace({ numberOfSpans: 1 });
const { traceID: id } = trace;

it('handles a successful FETCH_TRACE', () => {
  const state = traceReducer(undefined, {
    type: `${jaegerApiActions.fetchTrace}_FULFILLED`,
    payload: { data: [trace] },
    meta: { id },
  });
  
  // Using the state factory to create the expected state
  const expectedTraceData = transformTraceData(trace);
  const expectedTraceState = createTraceState(id, fetchedState.DONE, expectedTraceData);
  
  expect(state.traces).toEqual({ [id]: expectedTraceState });
});