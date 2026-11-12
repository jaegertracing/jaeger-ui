// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { GetTraceResponseSchema, refinedTracesData } from '../api/v3/schemas';
import type { ResourceSpansWire, TracesDataWire } from '../api/v3/schemas';

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isOtelUpload(value: unknown): value is Record<string, unknown> {
  if (!isObject(value)) return false;
  if ('resourceSpans' in value || Object.keys(value).length === 0) return true;
  // An empty TracesData message may omit resourceSpans altogether.
  return (
    isObject(value.result) && ('resourceSpans' in value.result || Object.keys(value.result).length === 0)
  );
}

function normalizeObject(value: unknown, fields: Record<string, (field: unknown) => unknown>): unknown {
  if (!isObject(value)) return value;
  let result = value;
  for (const [key, normalize] of Object.entries(fields)) {
    if (!(key in value)) continue;
    const normalized = normalize(value[key]);
    if (normalized === value[key]) continue;
    if (result === value) result = { ...value };
    result[key] = normalized;
  }
  return result;
}

function normalizeArray(value: unknown, normalize: (item: unknown) => unknown): unknown {
  if (!Array.isArray(value)) return value;
  let result = value;
  value.forEach((item, index) => {
    const normalized = normalize(item);
    if (normalized === item) return;
    if (result === value) result = value.slice();
    result[index] = normalized;
  });
  return result;
}

function normalizeInteger(value: unknown): unknown {
  return typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value;
}

function normalizeTimestamp(value: unknown): unknown {
  return typeof value === 'number' && value >= 0 ? normalizeInteger(value) : value;
}

function normalizeAnyValue(value: unknown): unknown {
  return normalizeObject(value, {
    intValue: normalizeInteger,
    arrayValue: array =>
      normalizeObject(array, { values: values => normalizeArray(values, normalizeAnyValue) }),
    kvlistValue: list => normalizeObject(list, { values: normalizeAttributes }),
  });
}

function normalizeAttributes(value: unknown): unknown {
  return normalizeArray(value, attribute => normalizeObject(attribute, { value: normalizeAnyValue }));
}

function normalizeAttributeOwner(value: unknown): unknown {
  return normalizeObject(value, { attributes: normalizeAttributes });
}

function normalizeSpan(value: unknown): unknown {
  return normalizeObject(value, {
    startTimeUnixNano: normalizeTimestamp,
    endTimeUnixNano: normalizeTimestamp,
    attributes: normalizeAttributes,
    events: events =>
      normalizeArray(events, event =>
        normalizeObject(event, { timeUnixNano: normalizeTimestamp, attributes: normalizeAttributes })
      ),
    links: links => normalizeArray(links, normalizeAttributeOwner),
  });
}

function normalizeTracesData(value: unknown): unknown {
  return normalizeObject(value, {
    resourceSpans: resources =>
      normalizeArray(resources, resource =>
        normalizeObject(resource, {
          resource: normalizeAttributeOwner,
          scopeSpans: scopes =>
            normalizeArray(scopes, scope =>
              normalizeObject(scope, {
                scope: normalizeAttributeOwner,
                spans: spans => normalizeArray(spans, normalizeSpan),
              })
            ),
        })
      ),
  });
}

// Ranges a quoted value can take: timestamps are uint64 and AnyValue.intValue is int64.
// JSON.parse rounds the largest of each up to exactly 2^64 and 2^63, so the bounds are inclusive.
const INT64_RANGES = new Map<unknown, readonly [number, number]>([
  ['startTimeUnixNano', [0, 2 ** 64]],
  ['endTimeUnixNano', [0, 2 ** 64]],
  ['timeUnixNano', [0, 2 ** 64]],
  ['intValue', [-(2 ** 63), 2 ** 63]],
]);

// JSON.parse has already rounded integers beyond 2^53, so normalization keeps them as numbers
// and the schemas reject them. Replace Zod's generic type error with the fix for the uploader,
// but only when quoting would make the value valid.
// Upload-only error map; do not copy into JaegerClient, whose wire contract is string-only.
const uploadParseContext: Parameters<typeof refinedTracesData.parse>[1] = {
  error: issue => {
    const range = INT64_RANGES.get(issue.path?.at(-1));
    const value = issue.input;
    return issue.code === 'invalid_type' &&
      range !== undefined &&
      typeof value === 'number' &&
      Number.isInteger(value) &&
      !Number.isSafeInteger(value) &&
      value >= range[0] &&
      value <= range[1]
      ? 'Numeric int64 value exceeds 2^53 and lost precision; send int64 values as quoted decimal strings'
      : undefined;
  },
};

export function validateOtelUpload(input: Record<string, unknown>): TracesDataWire {
  // Normalize numeric int64s only at the upload boundary, preserving the input and unknown metadata.
  // Shared schemas default omitted scopeSpans/spans to [] for uploads and network responses.
  return !('resourceSpans' in input) && 'result' in input
    ? GetTraceResponseSchema.parse(
        normalizeObject(input, { result: normalizeTracesData }),
        uploadParseContext
      ).result
    : refinedTracesData.parse(normalizeTracesData(input), uploadParseContext);
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
