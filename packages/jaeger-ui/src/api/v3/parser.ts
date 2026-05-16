// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import {
  AttributeValue,
  IAttribute,
  ILink,
  IOtelSpan,
  IOtelTrace,
  IResource,
  IScope,
  SpanKind,
  StatusCode,
} from '../../types/otel';
import { Microseconds } from '../../types/units';

// OTLP wire format types
type OtlpAnyValue = {
  stringValue?: string;
  intValue?: string | number;
  doubleValue?: number;
  boolValue?: boolean;
  arrayValue?: { values?: OtlpAnyValue[] };
  kvlistValue?: { values?: { key: string; value: OtlpAnyValue }[] };
  bytesValue?: string;
};

type OtlpAttribute = { key: string; value: OtlpAnyValue };

type OtlpLink = {
  traceId: string;
  spanId: string;
  attributes?: OtlpAttribute[];
};

type OtlpStatus = {
  code?: number;
  message?: string;
};

type OtlpSpan = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind?: number;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes?: OtlpAttribute[];
  events?: {
    timeUnixNano: string;
    name: string;
    attributes?: OtlpAttribute[];
  }[];
  links?: OtlpLink[];
  status?: OtlpStatus;
};

type OtlpResourceSpans = {
  resource?: { attributes?: OtlpAttribute[] };
  scopeSpans?: {
    scope?: { name?: string; version?: string; attributes?: OtlpAttribute[] };
    spans?: OtlpSpan[];
  }[];
};

export type OtlpTracesData = {
  resourceSpans?: OtlpResourceSpans[];
};

// Internal mutable type used during tree construction
type MutableSpan = Omit<IOtelSpan, 'parentSpan' | 'childSpans' | 'inboundLinks' | 'warnings'> & {
  parentSpan?: MutableSpan;
  childSpans: MutableSpan[];
  inboundLinks: ILink[];
  warnings: string[] | null;
};

const KIND_MAP: { [k: number]: SpanKind } = {
  0: SpanKind.INTERNAL,
  1: SpanKind.INTERNAL,
  2: SpanKind.SERVER,
  3: SpanKind.CLIENT,
  4: SpanKind.PRODUCER,
  5: SpanKind.CONSUMER,
};

const STATUS_MAP: { [k: number]: StatusCode } = {
  0: StatusCode.UNSET,
  1: StatusCode.OK,
  2: StatusCode.ERROR,
};

function nanoToMicro(nanoStr: string): Microseconds {
  // Slice off the last 3 digits to divide by 1000 without BigInt (avoids precision loss via float64).
  return Number(nanoStr.length > 3 ? nanoStr.slice(0, -3) : '0') as Microseconds;
}

function parseAttrValue(v: OtlpAnyValue): AttributeValue {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.boolValue !== undefined) return v.boolValue;
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.intValue !== undefined) {
    const n = Number(v.intValue);
    return Number.isSafeInteger(n) ? n : String(v.intValue);
  }
  if (v.arrayValue !== undefined) {
    return (v.arrayValue.values ?? []).map(parseAttrValue);
  }
  if (v.kvlistValue !== undefined) {
    const obj: { [key: string]: AttributeValue } = {};
    for (const kv of v.kvlistValue.values ?? []) {
      obj[kv.key] = parseAttrValue(kv.value);
    }
    return obj;
  }
  if (v.bytesValue !== undefined) {
    const binary = globalThis.atob(v.bytesValue);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  return '';
}

function parseAttrs(attrs?: OtlpAttribute[]): IAttribute[] {
  if (!attrs) return [];
  return attrs.map(a => ({ key: a.key, value: parseAttrValue(a.value) }));
}

function parseResource(res?: { attributes?: OtlpAttribute[] }): IResource {
  const attributes = parseAttrs(res?.attributes);
  const serviceAttr = attributes.find(a => a.key === 'service.name');
  const serviceName = typeof serviceAttr?.value === 'string' ? serviceAttr.value : '';
  return { attributes, serviceName };
}

function parseScope(scope?: { name?: string; version?: string; attributes?: OtlpAttribute[] }): IScope {
  return {
    name: scope?.name ?? '',
    version: scope?.version,
    attributes: parseAttrs(scope?.attributes),
  };
}

function assignDepths(roots: MutableSpan[]) {
  const stack: { span: MutableSpan; depth: number }[] = roots.map(s => ({ span: s, depth: 0 }));
  while (stack.length > 0) {
    const { span, depth } = stack.pop()!;
    span.depth = depth;
    for (const child of span.childSpans) {
      stack.push({ span: child, depth: depth + 1 });
    }
  }
}

export function parseOtlpTrace(data: OtlpTracesData): IOtelTrace {
  const flatSpans: { s: OtlpSpan; resource: IResource; scope: IScope }[] = [];

  for (const rs of data.resourceSpans ?? []) {
    const resource = parseResource(rs.resource);
    for (const ss of rs.scopeSpans ?? []) {
      const scope = parseScope(ss.scope);
      for (const s of ss.spans ?? []) {
        flatSpans.push({ s, resource, scope });
      }
    }
  }

  if (flatSpans.length === 0) {
    throw new Error('No spans found in trace data');
  }

  const spanMap = new Map<string, MutableSpan>();
  const mutableSpans: MutableSpan[] = [];

  for (const { s, resource, scope } of flatSpans) {
    const startTime = nanoToMicro(s.startTimeUnixNano);
    const endTime = nanoToMicro(s.endTimeUnixNano);
    const statusCode = STATUS_MAP[s.status?.code ?? 0] ?? StatusCode.UNSET;

    const ms: MutableSpan = {
      traceID: s.traceId,
      spanID: s.spanId,
      parentSpanID: s.parentSpanId || undefined,
      name: s.name,
      kind: KIND_MAP[s.kind ?? 0] ?? SpanKind.INTERNAL,
      startTime,
      endTime,
      duration: (endTime - startTime) as Microseconds,
      attributes: parseAttrs(s.attributes),
      events: (s.events ?? []).map(e => ({
        timestamp: nanoToMicro(e.timeUnixNano),
        name: e.name,
        attributes: parseAttrs(e.attributes),
      })),
      links: (s.links ?? []).map(l => ({
        traceID: l.traceId,
        spanID: l.spanId,
        attributes: parseAttrs(l.attributes),
      })),
      status: { code: statusCode, message: s.status?.message },
      resource,
      instrumentationScope: scope,
      depth: 0,
      hasChildren: false,
      childSpans: [] as MutableSpan[],
      relativeStartTime: 0 as Microseconds,
      inboundLinks: [],
      warnings: null,
    };

    mutableSpans.push(ms);
    spanMap.set(s.spanId, ms);
  }

  // Wire parent-child relationships
  const rootSpans: MutableSpan[] = [];
  let orphanSpanCount = 0;

  for (const ms of mutableSpans) {
    if (ms.parentSpanID) {
      const parent = spanMap.get(ms.parentSpanID);
      if (parent) {
        ms.parentSpan = parent;
        parent.childSpans.push(ms);
        parent.hasChildren = true;
      } else {
        orphanSpanCount++;
        rootSpans.push(ms);
      }
    } else {
      rootSpans.push(ms);
    }
  }

  assignDepths(rootSpans);

  const traceID = mutableSpans[0].traceID;

  // Build inboundLinks — for each outbound link that points to a span in this trace,
  // add an inbound link on the target so the UI can surface "referenced by" relationships.
  // Only match links whose traceID matches the current trace to avoid false positives when
  // an external trace happens to share a spanID with a local span.
  for (const ms of mutableSpans) {
    for (const link of ms.links) {
      if (link.traceID !== traceID) continue;
      const target = spanMap.get(link.spanID);
      if (target) {
        target.inboundLinks.push({
          traceID: ms.traceID,
          spanID: ms.spanID,
          attributes: link.attributes,
          span: ms as IOtelSpan,
        });
      }
    }
  }

  // Compute trace timing
  let traceStartTime = Infinity;
  let traceEndTime = -Infinity;
  for (const ms of mutableSpans) {
    if (ms.startTime < traceStartTime) traceStartTime = ms.startTime;
    if (ms.endTime > traceEndTime) traceEndTime = ms.endTime;
  }
  const startTime = traceStartTime as Microseconds;
  const endTime = traceEndTime as Microseconds;
  const duration = (traceEndTime - traceStartTime) as Microseconds;

  for (const ms of mutableSpans) {
    ms.relativeStartTime = (ms.startTime - traceStartTime) as Microseconds;
  }

  // Count spans per service
  const serviceCountMap = new Map<string, number>();
  for (const ms of mutableSpans) {
    const svc = ms.resource.serviceName;
    serviceCountMap.set(svc, (serviceCountMap.get(svc) ?? 0) + 1);
  }
  const services = [...serviceCountMap.entries()].map(([name, numberOfSpans]) => ({
    name,
    numberOfSpans,
  }));

  // traceName from the earliest root span; fall back to all spans if rootSpans is empty (cycle in trace)
  const candidates = rootSpans.length > 0 ? rootSpans : mutableSpans;
  const primaryRoot = candidates.reduce((earliest, s) => (s.startTime < earliest.startTime ? s : earliest));
  const traceName = `${primaryRoot.resource.serviceName}: ${primaryRoot.name}`;

  return {
    traceID,
    spans: [...mutableSpans].sort((a, b) => a.startTime - b.startTime) as IOtelSpan[],
    duration,
    startTime,
    endTime,
    traceName,
    tracePageTitle: traceName,
    traceEmoji: '',
    services,
    spanMap: spanMap as unknown as ReadonlyMap<string, IOtelSpan>,
    rootSpans: rootSpans as IOtelSpan[],
    orphanSpanCount,
    hasErrors() {
      return mutableSpans.some(ms => ms.status.code === StatusCode.ERROR);
    },
  };
}
