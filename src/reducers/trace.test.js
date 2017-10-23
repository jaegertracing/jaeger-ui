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

import * as jaegerApiActions from '../../src/actions/jaeger-api';
import traceReducer from '../../src/reducers/trace';
import traceGenerator from '../../src/demo/trace-generators';
import transformTraceData from '../../src/model/transform-trace-data';

const generatedTrace = traceGenerator.trace({ numberOfSpans: 1 });
const { traceID } = generatedTrace;

it('trace reducer should set loading true on a fetch', () => {
  const state = traceReducer(undefined, {
    type: `${jaegerApiActions.fetchTrace}_PENDING`,
  });
  expect(state.loading).toBe(true);
});

it('trace reducer should handle a successful FETCH_TRACE', () => {
  const state = traceReducer(undefined, {
    type: `${jaegerApiActions.fetchTrace}_FULFILLED`,
    payload: { data: [generatedTrace] },
    meta: { id: traceID },
  });
  expect(state.traces).toEqual({ [traceID]: transformTraceData(generatedTrace) });
  expect(state.loading).toBe(false);
});

it('trace reducer should handle a failed FETCH_TRACE', () => {
  const error = new Error();
  const state = traceReducer(undefined, {
    type: `${jaegerApiActions.fetchTrace}_REJECTED`,
    payload: error,
    meta: { id: traceID },
  });
  expect(state.traces).toEqual({ [traceID]: error });
  expect(state.traces[traceID]).toBe(error);
  expect(state.loading).toBe(false);
});

it('trace reducer should handle a successful SEARCH_TRACES', () => {
  const state = traceReducer(undefined, {
    type: `${jaegerApiActions.searchTraces}_FULFILLED`,
    payload: { data: [generatedTrace] },
    meta: { query: 'whatever' },
  });
  expect(state.traces).toEqual({ [traceID]: transformTraceData(generatedTrace) });
  expect(state.loading).toBe(false);
});
