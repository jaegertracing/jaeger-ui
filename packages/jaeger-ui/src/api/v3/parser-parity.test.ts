// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import transformTraceData from '../../model/transform-trace-data';
import { traceContractCases, ids } from '../../model/trace-contract.fixtures';
import {
  assertTraceContract,
  assertTraceIdentity,
  assertSpanFields,
  traceModelFields,
} from '../../model/trace-contract.test-utils';
import { SpanKind, StatusCode, type IOtelTrace } from '../../types/otel';
import type { SpanData, TraceData } from '../../types/trace';
import { GetTraceResponseSchema, refinedTracesData } from './schemas';
import { parseOtelTrace } from './parser';
import converted from './parser-parity-fixtures.json';
import paired from './parser-parity-capture.json';

type LegacyInput = TraceData & { spans: SpanData[] };

// Check each allowed difference before adapting that field for equality.
// Unknown differences still fail the complete model comparison.
function expectMappedParity(legacy: IOtelTrace, native: IOtelTrace, caseName: string) {
  const left = traceModelFields(legacy);
  const right = traceModelFields(native);
  if (caseName === 'follows-from-parent') {
    // Jaeger's adapter retains FOLLOWS_FROM as a link even when it also chooses
    // it as the parent. The facade excludes that reference and its inverse.
    const child = native.spanMap.get(ids.child)!;
    const root = native.spanMap.get(ids.root)!;
    expect(child.links.map(link => [link.traceID, link.spanID, link.span])).toEqual([
      [native.traceID, ids.root, root],
    ]);
    expect(root.inboundLinks.map(link => [link.traceID, link.spanID, link.span])).toEqual([
      [native.traceID, ids.child, child],
    ]);
    expect(legacy.spanMap.get(ids.child)!.links).toEqual([]);
    expect(legacy.spanMap.get(ids.root)!.inboundLinks).toEqual([]);
    left.spans.find(span => span.spanID === ids.child)!.links = [
      { traceID: legacy.traceID, spanID: ids.root, resolvedSpanID: ids.root, attributes: [] },
    ];
    left.spans.find(span => span.spanID === ids.root)!.inboundLinks = [
      { traceID: legacy.traceID, spanID: ids.child, resolvedSpanID: ids.child, attributes: [] },
    ];
  }
  for (let index = 0; index < left.spans.length; index++) {
    const a = left.spans[index];
    const b = right.spans[index];
    if (b.kind === SpanKind.UNSPECIFIED) {
      expect(a.kind).toBe(SpanKind.INTERNAL);
      expect(a.attributes.some(attribute => attribute.key === 'span.kind')).toBe(false);
      a.kind = SpanKind.UNSPECIFIED;
    }
    if (b.status.code === StatusCode.UNSET) {
      // The legacy facade infers status from truthy error tags. The backend
      // converter does not treat the string "true" as a boolean error.
      const error = a.attributes.find(attribute => attribute.key === 'error');
      if (error?.value) {
        expect(caseName).toBe('field-mapping');
        expect(error.value).toBe('true');
      }
      expect(a.status).toEqual(
        error?.value ? { code: StatusCode.ERROR, message: 'error' } : { code: StatusCode.OK }
      );
      expect(b.status).toEqual({ code: StatusCode.UNSET, message: undefined });
      a.status = b.status;
    }
    for (const link of [...b.links, ...b.inboundLinks]) {
      expect(['secondary-reference', 'secondary-child-of', 'follows-from-parent']).toContain(caseName);
      expect(link.attributes).toEqual([
        {
          key: 'opentracing.ref_type',
          value: caseName === 'secondary-child-of' ? 'child_of' : 'follows_from',
        },
      ]);
      // This attribute preserves the legacy reference type. It is additional
      // data on the native model, not a field the facade can expose.
      link.attributes = [];
    }
    const kindTag = a.attributes.find(attribute => attribute.key === 'span.kind');
    if (kindTag) {
      expect(kindTag.value).toBe(b.kind.toLowerCase());
      expect(b.attributes.some(attribute => attribute.key === 'span.kind')).toBe(false);
      a.attributes = a.attributes.filter(attribute => attribute.key !== 'span.kind');
    }
    // Attributes are key-addressed; graph, event, link and service ordering
    // remain positional. Sorting attributes never discards their values.
    a.attributes.sort((x, y) => x.key.localeCompare(y.key));
    b.attributes.sort((x, y) => x.key.localeCompare(y.key));
    expect(b.resource.attributes.find(attribute => attribute.key === 'service.name')).toEqual({
      key: 'service.name',
      value: a.resource.serviceName,
    });
    b.resource.attributes = b.resource.attributes.filter(attribute => attribute.key !== 'service.name');
    a.resource.attributes.sort((x, y) => x.key.localeCompare(y.key));
    b.resource.attributes.sort((x, y) => x.key.localeCompare(y.key));
    if (b.instrumentationScope.name === 'no-name') {
      expect(b.instrumentationScope).toEqual({ name: 'no-name', version: undefined, attributes: [] });
      expect(a.instrumentationScope).toEqual({
        name: a.attributes.find(attribute => attribute.key === 'otel.library.name')?.value ?? 'unknown',
        version: a.attributes.find(attribute => attribute.key === 'otel.library.version')?.value,
        attributes: [],
      });
      a.instrumentationScope = b.instrumentationScope;
    }
    for (let eventIndex = 0; eventIndex < a.events.length; eventIndex++) {
      const event = a.events[eventIndex];
      const nameTag = event.attributes.find(attribute => attribute.key === 'event');
      if (nameTag) {
        expect(nameTag.value).toBe(event.name);
        expect(b.events[eventIndex].attributes.some(attribute => attribute.key === 'event')).toBe(false);
        event.attributes = event.attributes.filter(attribute => attribute.key !== 'event');
      }
      event.attributes.sort((x, y) => x.key.localeCompare(y.key));
      b.events[eventIndex].attributes.sort((x, y) => x.key.localeCompare(y.key));
    }
  }
  expect(left.hasErrors).toBe(legacy.spans.some(span => span.status.code === StatusCode.ERROR));
  expect(right.hasErrors).toBe(native.spans.some(span => span.status.code === StatusCode.ERROR));
  left.hasErrors = left.spans.some(span => span.status.code === StatusCode.ERROR);
  expect(right).toEqual(left);
}

describe('legacy behavioral contract on both trace pipelines', () => {
  beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it.each(traceContractCases())('$name', fixture => {
    const capture = converted.find(item => item.name === fixture.name)!;
    expect(capture.legacy).toEqual(JSON.parse(JSON.stringify(fixture.input)));
    const legacy = transformTraceData(structuredClone(capture.legacy) as LegacyInput)!.asOtelTrace();
    const native = parseOtelTrace(refinedTracesData.parse(capture.otlp))!;
    assertTraceContract(legacy, fixture);
    assertTraceContract(native, fixture);
    expect(native.traceRootSpanID).toBe(fixture.roots[0]);
    expectMappedParity(legacy, native, fixture.name);
  });

  it('compares paired legacy and v3 responses for the same stored trace', () => {
    const legacy = transformTraceData(
      structuredClone(paired.legacy.data[0]) as unknown as LegacyInput
    )!.asOtelTrace();
    const native = parseOtelTrace(GetTraceResponseSchema.parse(paired.v3).result)!;
    assertTraceContract(legacy, traceContractCases()[0]);
    assertTraceContract(native, traceContractCases()[0]);
    expectMappedParity(legacy, native, 'field-mapping');
  });

  it('keeps repaired start times and original durations down the broken chain', () => {
    const fixture = converted.find(item => item.name === 'repaired-chain')!;
    const legacy = transformTraceData(structuredClone(fixture.legacy) as LegacyInput)!.asOtelTrace();
    const native = parseOtelTrace(refinedTracesData.parse(fixture.otlp))!;
    for (const trace of [legacy, native]) {
      expect(trace.spanMap.get(ids.child)!.startTime).toBe(1784570820629325);
      expect(trace.spanMap.get(ids.child)!.duration).toBe(200);
      expect(trace.spanMap.get(ids.grandchild)!.duration).toBe(50);
    }
  });

  it('reuses facade identity, timing, attribute and event expectations', () => {
    const fixture = converted.find(item => item.name === 'field-mapping')!;
    const legacy = transformTraceData(structuredClone(fixture.legacy) as LegacyInput)!.asOtelTrace();
    const native = parseOtelTrace(refinedTracesData.parse(fixture.otlp))!;
    for (const trace of [legacy, native]) {
      const root = trace.spanMap.get(ids.root)!;
      assertSpanFields(root, {
        traceID: fixture.legacy.traceID,
        spanID: ids.root,
        name: 'test-op',
        startTime: 1000 as IOtelTrace['startTime'],
        endTime: 2000 as IOtelTrace['endTime'],
        duration: 1000 as IOtelTrace['duration'],
      });
      expect(root.kind).toBe(SpanKind.SERVER);
      expect(root.attributes.getValue('http.method')).toBe('GET');
      expect(root.resource.attributes.getValue('res-tag')).toBe('res-val');
      expect(root.events).toHaveLength(1);
      expect(root.events[0].timestamp).toBe(1100);
      expect(root.events[0].name).toBe('test-event');
      expect(root.events[0].attributes.getValue('foo')).toBe('bar');
      expect(trace.isGenAITrace).toBe(true);
    }
  });

  it('repairs cycles while legacy leaves a zero-range empty trace', () => {
    const fixture = converted.find(item => item.name === 'parent-cycle')!;
    const legacy = transformTraceData(structuredClone(fixture.legacy) as LegacyInput)!.asOtelTrace();
    expect(legacy.spans).toEqual([]);
    expect([legacy.startTime, legacy.endTime, legacy.duration]).toEqual([0, 0, 0]);
    const native = parseOtelTrace(refinedTracesData.parse(fixture.otlp))!;
    expect(native.spans.map(span => span.spanID)).toEqual([ids.root, ids.child]);
    expect(native.rootSpans.map(span => span.spanID)).toEqual([ids.root]);
    expect(native.spanMap.get(ids.root)!.parentSpanID).toBeUndefined();
    expect(native.spanMap.get(ids.root)!.warnings).toEqual([
      `Cyclic parent reference to ${ids.child} removed`,
    ]);
    assertTraceIdentity(native);
  });

  it('does not resolve a cross-trace link to a local span with the same ID', () => {
    const otherTraceID = '0123456789abcdef0123456789abcdef';
    const fixture = converted.find(item => item.name === 'cross-trace-link')!;
    const legacyData = structuredClone(fixture.legacy) as LegacyInput;
    const legacy = transformTraceData(legacyData)!.asOtelTrace();
    expect(legacy.spanMap.get(ids.sibling)!.links[0].span).toBe(legacy.spanMap.get(ids.child));
    const native = parseOtelTrace(refinedTracesData.parse(fixture.otlp))!;
    expect(native.spanMap.get(ids.sibling)!.links[0]).toMatchObject({
      traceID: otherTraceID,
      spanID: ids.child,
    });
    expect(native.spanMap.get(ids.sibling)!.links[0].span).toBeUndefined();
    expect(native.spanMap.get(ids.child)!.inboundLinks).toEqual([]);
    assertTraceIdentity(native);
  });
});
