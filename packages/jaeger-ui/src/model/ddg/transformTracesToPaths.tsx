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

import memoizeOne from 'memoize-one';
import { getTraceSpanIdsAsTree, TREE_ROOT_ID } from '../../selectors/trace';

import { TDdgPayloadEntry, TDdgPayloadPath, TDdgPayload } from './types';
import { FetchedTrace } from '../../types';
import { Span } from '../../types/trace';

const isKindServer = (span: Span) =>
  span.tags.find(({ key, value }) => key === 'span.kind' && value === 'server');

function transformTracesToPaths(
  traces: Record<string, FetchedTrace>,
  focalService: string,
  focalOperation?: string
): TDdgPayload {
  const dependenciesMap = new Map<String, TDdgPayloadPath>();
  Object.values(traces).forEach(({ data }) => {
    if (data) {
      const spanMap: Map<string, Span> = new Map();
      const { traceID } = data;
      data.spans.forEach(span => spanMap.set(span.spanID, span));
      const tree = getTraceSpanIdsAsTree(data);
      tree.paths((pathIds: string[]) => {
        const paths = pathIds.reduce((reducedSpans: Span[], id: string): Span[] => {
          if (id === TREE_ROOT_ID) {
            return reducedSpans;
          }
          const span = spanMap.get(id);
          if (!span) throw new Error(`Ancestor spanID ${id} not found in trace ${traceID}`);
          if (reducedSpans.length === 0) {
            reducedSpans.push(span);
          } else if (
            reducedSpans[reducedSpans.length - 1].processID !== span.processID ||
            isKindServer(span)
          ) {
            reducedSpans.push(span);
          }
          return reducedSpans;
        }, []);
        const path: TDdgPayloadEntry[] = paths.map(({ processID, operationName: operation }) => ({
          service: data.processes[processID].serviceName,
          operation,
        }));
        if (
          path.some(
            ({ service, operation }) =>
              service === focalService && (!focalOperation || operation === focalOperation)
          )
        ) {
          const pathKey = path.map(value => `${value.operation}:${value.service}`).join('/');
          const dependency = dependenciesMap.get(pathKey);
          if (!dependency) {
            dependenciesMap.set(pathKey, {
              path,
              attributes: [
                {
                  key: 'exemplar_trace_id',
                  value: traceID,
                },
              ],
            });
          } else {
            dependency.attributes.push({
              key: 'exemplar_trace_id',
              value: traceID,
            });
          }
        }
      });
    }
  });
  const dependencies = Array.from(dependenciesMap.values());
  return { dependencies };
}

export default memoizeOne(transformTracesToPaths);
