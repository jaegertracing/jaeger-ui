// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

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
  const dependenciesMap = new Map<string, TDdgPayloadPath>();
  Object.values(traces).forEach(({ data }) => {
    if (data) {
      // Use the pre-built spanMap and tree from the trace object if available,
      // otherwise build them on demand (e.g., in tests)
      const spanMap = data.spanMap || null;
      const tree = data.tree || getTraceSpanIdsAsTree(data, spanMap).root;
      const { traceID } = data;
      // Ensure we have a spanMap for looking up spans
      const effectiveSpanMap = spanMap || new Map(data.spans.map(span => [span.spanID, span]));
      tree.paths((pathIds: string[]) => {
        const paths = pathIds.reduce((reducedSpans: Span[], id: string): Span[] => {
          if (id === TREE_ROOT_ID) {
            return reducedSpans;
          }
          const span = effectiveSpanMap.get(id);
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
