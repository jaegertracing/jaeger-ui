// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import memoizeOne from 'memoize-one';

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
      // Use the pre-built spanMap and rootSpans from the trace object
      const spanMap = data.spanMap;
      const rootSpans = data.rootSpans;
      const { traceID } = data;

      // Helper function to walk all paths through the tree
      const walkPaths = (span: Span, currentPath: string[]) => {
        const pathWithCurrent = [...currentPath, span.spanID];

        if (span.childSpans.length === 0) {
          // Leaf node - process the complete path
          processPath(pathWithCurrent);
        } else {
          // Continue walking through children
          span.childSpans.forEach(child => {
            walkPaths(child, pathWithCurrent);
          });
        }
      };

      const processPath = (pathIds: string[]) => {
        const paths = pathIds.reduce((reducedSpans: Span[], id: string): Span[] => {
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
      };

      // Start walking from all root spans
      rootSpans.forEach(rootSpan => {
        walkPaths(rootSpan, []);
      });
    }
  });
  const dependencies = Array.from(dependenciesMap.values());
  return { dependencies };
}

export default memoizeOne(transformTracesToPaths);
