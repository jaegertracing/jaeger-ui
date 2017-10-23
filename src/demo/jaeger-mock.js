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

import Chance from 'chance';

import traceGenerator, { SERVICE_LIST, OPERATIONS_LIST } from './trace-generators';
import dependencyGenerator from './dependency-generators';
import { getTraceId } from '../selectors/trace';

const chance = new Chance();

export const DEPENDENCIES_FIXTURES = dependencyGenerator.dependencies({});
export const TRACE_FIXTURES = traceGenerator.traces({});
const traceMap = new Map(TRACE_FIXTURES.map(trace => [getTraceId(trace), trace]));

function resolveWithData(data) {
  return new Promise(resolve => setTimeout(() => resolve({ data })), chance.integer({ min: 100, max: 2000 }));
}

function rejectWithErrors(...errors) {
  return new Promise((resolve, reject) =>
    setTimeout(() => reject({ errors }), chance.integer({ min: 100, max: 2000 }))
  );
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
