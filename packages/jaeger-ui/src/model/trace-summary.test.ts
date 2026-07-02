// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { traceToTraceSummary } from './trace-summary';
import transformTraceData from './transform-trace-data';
import traceGenerator from '../demo/trace-generators';
import { ATTR_GEN_AI_RESPONSE_FINISH_REASONS } from '@opentelemetry/semantic-conventions/incubating';
import { StatusCode, SpanKind } from '../types/otel';
import type { IOtelTrace, IOtelSpan, IResource } from '../types/otel';
import type { Microseconds } from '../types/units';

const us = (n: number) => n as Microseconds;

function makeMinimalTrace(overrides: Partial<IOtelTrace> = {}): IOtelTrace {
  return {
    traceID: 'abc123',
    spans: [],
    duration: us(500),
    startTime: us(1000),
    endTime: us(1500),
    traceName: 'svc / op',
    tracePageTitle: 'svc: op',
    traceEmoji: '',
    services: [],
    spanMap: new Map(),
    rootSpans: [],
    orphanSpanCount: 0,
    hasErrors: () => false,
    ...overrides,
  };
}

function makeSpan(serviceName: string, spanID: string, statusCode: StatusCode = StatusCode.OK): IOtelSpan {
  const resource: IResource = { serviceName, attributes: [] };
  return {
    traceID: 'abc123',
    spanID,
    name: 'op',
    kind: SpanKind.INTERNAL,
    startTime: us(1000),
    endTime: us(1500),
    duration: us(500),
    attributes: [],
    events: [],
    links: [],
    status: { code: statusCode },
    resource,
    instrumentationScope: { name: 'unknown' },
    depth: 0,
    hasChildren: false,
    childSpans: [],
    relativeStartTime: us(0),
    inboundLinks: [],
    warnings: null,
  };
}

describe('traceToTraceSummary', () => {
  it('produces correct summary for an empty trace', () => {
    const trace = makeMinimalTrace();
    const summary = traceToTraceSummary(trace);

    expect(summary.traceID).toBe('abc123');
    expect(summary.traceName).toBe('svc / op');
    expect(summary.rootServiceName).toBe('');
    expect(summary.rootOperationName).toBe('');
    expect(summary.startTime).toBe(1000);
    expect(summary.duration).toBe(500);
    expect(summary.spanCount).toBe(0);
    expect(summary.errorSpanCount).toBe(0);
    expect(summary.warningSpanCount).toBe(0);
    expect(summary.orphanSpanCount).toBe(0);
    expect(summary.services).toEqual([]);
  });

  it('extracts root service and operation from the first root span', () => {
    const rootSpan = makeSpan('frontend', 'root1');
    rootSpan.name = 'GET /home';
    const trace = makeMinimalTrace({ rootSpans: [rootSpan] });
    const summary = traceToTraceSummary(trace);

    expect(summary.rootServiceName).toBe('frontend');
    expect(summary.rootOperationName).toBe('GET /home');
  });

  it('counts total and per-service error spans', () => {
    const s1 = makeSpan('svc-a', 's1', StatusCode.ERROR);
    const s2 = makeSpan('svc-a', 's2');
    const s3 = makeSpan('svc-b', 's3', StatusCode.ERROR);
    const trace = makeMinimalTrace({
      spans: [s1, s2, s3],
      services: [
        { name: 'svc-a', numberOfSpans: 2 },
        { name: 'svc-b', numberOfSpans: 1 },
      ],
    });
    const summary = traceToTraceSummary(trace);

    expect(summary.spanCount).toBe(3);
    expect(summary.errorSpanCount).toBe(2);

    const svcA = summary.services.find(s => s.name === 'svc-a')!;
    expect(svcA.spanCount).toBe(2);
    expect(svcA.errorSpanCount).toBe(1);

    const svcB = summary.services.find(s => s.name === 'svc-b')!;
    expect(svcB.spanCount).toBe(1);
    expect(svcB.errorSpanCount).toBe(1);
  });

  it('counts total and per-service warning spans', () => {
    const s1 = makeSpan('svc-a', 's1');
    s1.attributes = [{ key: ATTR_GEN_AI_RESPONSE_FINISH_REASONS, value: 'content_filter' }];
    const s2 = makeSpan('svc-a', 's2');
    const s3 = makeSpan('svc-b', 's3');
    s3.attributes = [{ key: ATTR_GEN_AI_RESPONSE_FINISH_REASONS, value: 'length' }];
    const trace = makeMinimalTrace({
      spans: [s1, s2, s3],
      services: [
        { name: 'svc-a', numberOfSpans: 2 },
        { name: 'svc-b', numberOfSpans: 1 },
      ],
    });
    const summary = traceToTraceSummary(trace);

    expect(summary.spanCount).toBe(3);
    expect(summary.warningSpanCount).toBe(2);

    const svcA = summary.services.find(s => s.name === 'svc-a')!;
    expect(svcA.spanCount).toBe(2);
    expect(svcA.warningSpanCount).toBe(1);

    const svcB = summary.services.find(s => s.name === 'svc-b')!;
    expect(svcB.spanCount).toBe(1);
    expect(svcB.warningSpanCount).toBe(1);
  });

  it('reports zero errors when no spans have error status', () => {
    const s1 = makeSpan('svc-a', 's1');
    const s2 = makeSpan('svc-a', 's2', StatusCode.UNSET);
    const trace = makeMinimalTrace({
      spans: [s1, s2],
      services: [{ name: 'svc-a', numberOfSpans: 2 }],
    });
    const summary = traceToTraceSummary(trace);

    expect(summary.errorSpanCount).toBe(0);
    expect(summary.warningSpanCount).toBe(0);
    expect(summary.services[0].errorSpanCount).toBe(0);
    expect(summary.services[0].warningSpanCount).toBe(0);
  });

  it('propagates orphanSpanCount from the OTEL trace', () => {
    const trace = makeMinimalTrace({ orphanSpanCount: 3 });
    const summary = traceToTraceSummary(trace);
    expect(summary.orphanSpanCount).toBe(3);
  });

  it('round-trips correctly through transformTraceData and traceGenerator', () => {
    const raw = traceGenerator.trace({});
    const legacyTrace = transformTraceData(raw)!;
    expect(legacyTrace).not.toBeNull();

    const otelTrace = legacyTrace.asOtelTrace();
    const summary = traceToTraceSummary(otelTrace);

    expect(summary.traceID).toBe(legacyTrace.traceID);
    expect(summary.spanCount).toBe(otelTrace.spans.length);
    expect(summary.duration).toBe(otelTrace.duration);
    expect(summary.startTime).toBe(otelTrace.startTime);
    expect(summary.services).toHaveLength(otelTrace.services.length);
    summary.services.forEach((s, i) => {
      expect(s.name).toBe(otelTrace.services[i].name);
      expect(s.spanCount).toBe(otelTrace.services[i].numberOfSpans);
    });
  });
});
