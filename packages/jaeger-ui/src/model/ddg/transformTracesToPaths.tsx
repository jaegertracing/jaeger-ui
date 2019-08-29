// Copyright (c) 2019 Uber Technologies, Inc.
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

import { TDdgPayloadEntry, TDdgPayload } from './types';
import { Span, Trace } from '../../types/trace';
import { FetchedTrace } from '../../types';
import spanAncestorIds from '../../utils/span-ancestor-ids';

type Node = {
  value?: Span;
  children: Node[];
};

const hasFocal = (path: TDdgPayloadEntry[], focalService: string, focalOperation: string | undefined) => {
  for (let i = 0; i < path.length; ++i) {
    if (
      focalService === path[i].service &&
      (focalOperation === undefined || focalOperation === path[i].operation)
    ) {
      return true;
    }
  }
  return false;
};

function convertSpan(span: Span, trace: Trace): TDdgPayloadEntry {
  const serviceName = trace.processes[span.processID].serviceName;
  const operationName = span.operationName;
  return { service: serviceName, operation: operationName };
}

export default function(
  traces: Record<string, FetchedTrace>,
  focalService: string,
  focalOperation: string | undefined
) {
  const paths: TDdgPayload = [];
  Object.values(traces).forEach(trace => {
    const map: Map<string, Span> = new Map();
    if (trace.data) {
      const traceId = trace.data.traceID;
      trace.data.spans
        .filter(span => {
          map.set(span.spanID, span);
          return !span.hasChildren;
        })
        .forEach(leaf => {
          const path = spanAncestorIds(leaf)
            // @ts-ignore
            .map(id => convertSpan(map.get(id), trace.data));
          // @ts-ignore
          path.push(convertSpan(map.get(leaf.spanID), trace.data));
          if (hasFocal(path, focalService, focalOperation)) {
            paths.push({
              path,
              trace_id: traceId,
            });
          }
        });
    }
  });
  return paths;
}
