// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { SpanData, TraceData } from '../../types/trace';
import { ITraceSpec } from './trace-contract-spec';

/** Renders a trace spec as the legacy /api/traces JSON that transformTraceData() reads. */
export function toLegacyTrace({
  traceID,
  serviceName,
  spans,
}: ITraceSpec): TraceData & { spans: SpanData[] } {
  const PROCESS_ID = 'p1';
  return {
    traceID,
    processes: { [PROCESS_ID]: { serviceName, tags: [] } },
    spans: spans.map(span => {
      const {
        spanID,
        operationName,
        kind,
        parentSpanID,
        references = [],
        startTime,
        duration,
        tags,
        events = [],
        scope,
      } = {
        startTime: 1,
        duration: 1,
        ...span,
      };
      const parentRef = parentSpanID ? [{ refType: 'CHILD_OF' as const, spanID: parentSpanID }] : [];
      return {
        traceID,
        spanID,
        operationName,
        references: [...parentRef, ...references].map(ref => ({ ...ref, traceID, span: undefined })),
        // SpanData requires timing fields, but explicit undefined values exercise missing-field handling.
        ...(startTime === undefined ? {} : { startTime }),
        ...(duration === undefined ? {} : { duration }),
        tags: [
          ...(tags ?? []),
          ...(kind === undefined
            ? []
            : [
                {
                  key: 'span.kind',
                  value:
                    ['unspecified', 'internal', 'server', 'client', 'producer', 'consumer'][kind] ??
                    String(kind),
                },
              ]),
          ...(scope?.name === undefined ? [] : [{ key: 'otel.library.name', value: scope.name }]),
          ...(scope?.version === undefined ? [] : [{ key: 'otel.library.version', value: scope.version }]),
        ],
        logs: events.map(event => ({
          timestamp: event.timestamp,
          fields: [
            ...(event.attributes ?? []),
            ...(event.name === undefined ? [] : [{ key: 'event', value: event.name }]),
          ],
        })),
        processID: PROCESS_ID,
      } as SpanData;
    }),
  };
}
