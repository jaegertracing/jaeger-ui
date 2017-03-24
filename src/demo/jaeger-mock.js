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

import Chance from 'chance';

import traceGenerator, {
  SERVICE_LIST,
  OPERATIONS_LIST,
} from './trace-generators';
import dependencyGenerator from './dependency-generators';
import { getTraceId } from '../selectors/trace';

const chance = new Chance();

export const DEPENDENCIES_FIXTURES = dependencyGenerator.dependencies({});
export const TRACE_FIXTURES = traceGenerator.traces({});
const traceMap = new Map(
  TRACE_FIXTURES.map(trace => [getTraceId(trace), trace])
);

function resolveWithData(data) {
  return new Promise(
    resolve => setTimeout(() => resolve({ data })),
    chance.integer({ min: 100, max: 2000 })
  );
}

function rejectWithErrors(...errors) {
  return new Promise((resolve, reject) =>
    setTimeout(
      () => reject({ errors }),
      chance.integer({ min: 100, max: 2000 })
    ));
}

export default {
  fetchTrace: id =>
    traceMap.has(id)
      ? resolveWithData([{ ...traceMap.get(id) }])
      : rejectWithErrors(new Error('trace not found')),
  searchTraces: () => resolveWithData(TRACE_FIXTURES),
  fetchServices: () => resolveWithData(SERVICE_LIST),
  fetchServiceOperations: () => resolveWithData(OPERATIONS_LIST),
  fetchDependencies: () => resolveWithData(DEPENDENCIES_FIXTURES),
};
