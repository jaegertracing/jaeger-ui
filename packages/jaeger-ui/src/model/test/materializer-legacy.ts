// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { Process, SpanData, SpanReference, TraceData } from '../../types/trace';
import { ITraceSpec } from './trace-contract-spec';

/** Renders a trace spec as the legacy /api/traces JSON that transformTraceData() reads. */
export function toLegacyTrace({
  traceID,
  serviceName,
  resource,
  spans,
}: ITraceSpec): TraceData & { spans: SpanData[] } {
  // One process per service, in order of first appearance.
  const processes: Record<string, Process> = {};
  const processIDByService = new Map<string, string>();
  for (const span of spans) {
    const name = span.serviceName ?? serviceName;
    if (processIDByService.has(name)) continue;
    const processID = `p${processIDByService.size + 1}`;
    processIDByService.set(name, processID);
    // Legacy process tags are typed as string values, but the facade reads them as-is.
    processes[processID] = { serviceName: name, tags: [...(resource ?? [])] as Process['tags'] };
  }

  return {
    traceID,
    processes,
    spans: spans.map(span => {
      const {
        spanID,
        name: operationName,
        kind,
        status,
        parentSpanID,
        links = [],
        startTime,
        duration,
        attributes: tags,
        events = [],
        scope,
        warnings,
      } = {
        startTime: 1,
        duration: 1,
        ...span,
      };
      // The transformer takes the first same-trace CHILD_OF as the parent, so links
      // stay FOLLOWS_FROM and come after the parent reference.
      const references: SpanReference[] = [
        ...(parentSpanID === undefined
          ? []
          : [{ refType: 'CHILD_OF' as const, traceID, spanID: parentSpanID, span: undefined }]),
        ...links.map(link => ({
          refType: 'FOLLOWS_FROM' as const,
          traceID: link.traceID ?? traceID,
          spanID: link.spanID,
          span: undefined,
        })),
      ];
      return {
        traceID,
        spanID,
        operationName,
        references,
        // SpanData requires timing fields, but explicit undefined values exercise missing-field handling.
        ...(startTime === undefined ? {} : { startTime }),
        ...(duration === undefined ? {} : { duration }),
        tags: [
          ...(tags ?? []),
          ...(kind === undefined ? [] : [{ key: 'span.kind', value: kind }]),
          ...(status === undefined || status.code === 'unset'
            ? []
            : [
                ...(status.code === 'error' ? [{ key: 'error', value: true }] : []),
                { key: 'otel.status_code', value: status.code === 'error' ? 'ERROR' : 'OK' },
                ...(status.message === undefined
                  ? []
                  : [{ key: 'otel.status_description', value: status.message }]),
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
        processID: processIDByService.get(span.serviceName ?? serviceName)!,
        // transformTraceData appends to this array, so the spec's copy stays unchanged.
        ...(warnings === undefined ? {} : { warnings: [...warnings] }),
      } as SpanData;
    }),
  };
}
