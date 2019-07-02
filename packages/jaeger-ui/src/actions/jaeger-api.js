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

import { createAction } from 'redux-actions';
import JaegerAPI from '../api/jaeger';

import * as paths from '../model/ddg/sample-paths.test.resources';

export const fetchTrace = createAction(
  '@JAEGER_API/FETCH_TRACE',
  id => JaegerAPI.fetchTrace(id),
  id => ({ id })
);

export const fetchMultipleTraces = createAction(
  '@JAEGER_API/FETCH_MULTIPLE_TRACES',
  ids => JaegerAPI.searchTraces({ traceID: ids }),
  ids => ({ ids })
);

export const archiveTrace = createAction(
  '@JAEGER_API/ARCHIVE_TRACE',
  id => JaegerAPI.archiveTrace(id),
  id => ({ id })
);

export const searchTraces = createAction(
  '@JAEGER_API/SEARCH_TRACES',
  query => JaegerAPI.searchTraces(query),
  query => ({ query })
);

export const fetchServices = createAction('@JAEGER_API/FETCH_SERVICES', () => JaegerAPI.fetchServices());

export const fetchServiceOperations = createAction(
  '@JAEGER_API/FETCH_SERVICE_OPERATIONS',
  serviceName => JaegerAPI.fetchServiceOperations(serviceName),
  serviceName => ({ serviceName })
);

function tempTestFetch() {
  let resolve;
  const promise = new Promise(res => {
    resolve = res;
  });
  setTimeout(() => {
    /* istanbul ignore next */
    resolve([paths.simplePath, paths.almostDoubleFocalPath]);
  }, 1000);
  return promise;
}

export const fetchDeepDependencyGraph = createAction(
  '@JAEGER_API/FETCH_DEEP_DEPENDENCY_GRAPH',
  // Temporary mock used until backend is available, TODO revert & re-enable test
  // query => JaegerAPI.fetchDeepDependencyGraph(query),
  tempTestFetch,
  query => ({ query })
);

export const fetchDependencies = createAction('@JAEGER_API/FETCH_DEPENDENCIES', () =>
  JaegerAPI.fetchDependencies()
);
