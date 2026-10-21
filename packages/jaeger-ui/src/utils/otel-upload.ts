// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { GetTraceResponseSchema, refinedTracesData } from '../api/v3/schemas';
import type { ResourceSpansWire, TracesDataWire } from '../api/v3/schemas';

export function isOtelUpload(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && ('resourceSpans' in value || 'result' in value);
}

export function validateOtelUpload(input: Record<string, unknown>): TracesDataWire {
  return 'result' in input ? GetTraceResponseSchema.parse(input).result : refinedTracesData.parse(input);
}

/** Group all valid documents in a file before any trace is parsed or cached. */
export function splitOtelUpload(documents: TracesDataWire[]): TracesDataWire[] {
  const traces = new Map<string, TracesDataWire>();
  for (const data of documents) {
    for (const resource of data.resourceSpans ?? []) {
      const resourcesByTrace = new Map<string, ResourceSpansWire>();
      for (const scope of resource.scopeSpans) {
        const spansByTrace = new Map<string, typeof scope.spans>();
        for (const span of scope.spans) {
          const id = span.traceId.toLowerCase();
          if (!spansByTrace.has(id)) spansByTrace.set(id, []);
          spansByTrace.get(id)!.push(span);
        }
        for (const [id, spans] of spansByTrace) {
          if (!resourcesByTrace.has(id)) {
            const entry: ResourceSpansWire = { ...resource, scopeSpans: [] };
            resourcesByTrace.set(id, entry);
            if (!traces.has(id)) traces.set(id, { ...data, resourceSpans: [] });
            traces.get(id)!.resourceSpans!.push(entry);
          }
          resourcesByTrace.get(id)!.scopeSpans.push({ ...scope, spans });
        }
      }
    }
  }
  return Array.from(traces.values());
}

/** FileLoader stores one trace per raw OTLP document, alongside legacy upload documents. */
export function uploadedTraceId(raw: unknown): string | undefined {
  if (raw === null || typeof raw !== 'object') return undefined;
  if ('traceID' in raw && typeof raw.traceID === 'string') return raw.traceID;
  if (!('resourceSpans' in raw) || !Array.isArray(raw.resourceSpans)) return undefined;
  for (const resource of raw.resourceSpans) {
    if (!Array.isArray(resource?.scopeSpans)) continue;
    for (const scope of resource.scopeSpans) {
      const id = scope?.spans?.[0]?.traceId;
      if (typeof id === 'string') return id.toLowerCase();
    }
  }
  return undefined;
}
