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

export function mergeAll(id) {
  return traces => {
    if (traces.data.length < 2) {
      return traces;
    }
    const ot = { traceID: id, spans: [], processes: {}, warnings: [] };

    const processMap = {};

    traces.data.forEach(trace => {
      const tracePidMap = {};
      Object.entries(trace.processes).forEach(([pid, process]) => {
        const pJson = JSON.stringify(process);
        let targetPid = processMap[pJson];
        if (!targetPid) {
          targetPid = `p${Object.keys(processMap).length + 1}`;
          processMap[pJson] = targetPid;
          ot.processes[targetPid] = process;
        }
        tracePidMap[pid] = targetPid;
      });
      trace.spans.forEach(span => {
        const ns = span;
        ns.processID = tracePidMap[ns.processID];
        ot.spans.push(ns);
      });
      if (trace.warnings) {
        trace.warnings.forEach(j => ot.warnings.push(j));
      }
    });

    return { data: [ot] };
  };
}

function reduceFetch(id) {
  const ids = id.split('|');
  const promise = ids.length < 2 ? JaegerAPI.fetchTrace(id) : JaegerAPI.searchTraces({ traceID: ids });
  return promise && promise.then(mergeAll(id));
}

export const fetchTrace = createAction('@JAEGER_API/FETCH_TRACE', id => reduceFetch(id), id => ({ id }));

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

export const fetchDeepDependencyGraph = createAction(
  '@JAEGER_API/FETCH_DEEP_DEPENDENCY_GRAPH',
  query => JaegerAPI.fetchDeepDependencyGraph(query),
  query => ({ query })
);

export const fetchDependencies = createAction('@JAEGER_API/FETCH_DEPENDENCIES', () =>
  JaegerAPI.fetchDependencies()
);
