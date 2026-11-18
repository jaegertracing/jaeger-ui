// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import Chance from 'chance';

import otelTraceGenerator from './otel-trace-generators';
import { parseOtelTrace } from '../api/v3/parser';
import { refinedTracesData } from '../api/v3/schemas';
import { SpanKind } from '../types/otel';

describe('otelTraceGenerator', () => {
  it('generates OTLP wire data that parses into an IOtelTrace', () => {
    const wire = otelTraceGenerator.wireTrace({ numberOfSpans: 3, numberOfProcesses: 2, maxDepth: 2 });
    const trace = parseOtelTrace(refinedTracesData.parse(wire));

    expect(trace).not.toBeNull();
    expect(trace!.spans).toHaveLength(3);
    expect(trace!.spans.map(span => span.traceID)).toEqual([trace!.traceID, trace!.traceID, trace!.traceID]);
    const serviceNames = wire.resourceSpans!.map(
      resourceSpan =>
        resourceSpan.resource!.attributes!.find(attribute => attribute.key === 'service.name')!.value!
          .stringValue
    );
    expect(new Set(trace!.spans.map(span => span.resource.serviceName))).toEqual(new Set(serviceNames));
  });

  it('keeps spans below the requested maximum depth', () => {
    const pickone = vi
      .spyOn(Chance.prototype, 'pickone')
      .mockImplementation(values => (values as string[]).at(-1));

    try {
      const trace = otelTraceGenerator.trace({ numberOfSpans: 3, numberOfProcesses: 1, maxDepth: 2 });

      expect(trace.spans.every(span => span.depth < 2)).toBe(true);
      expect(trace.rootSpans).toHaveLength(1);
      expect(trace.spans.map(span => span.depth)).toEqual([0, 1, 1]);
    } finally {
      pickone.mockRestore();
    }
  });

  it('keeps one root when the default maximum depth is at its minimum', () => {
    const integer = vi
      .spyOn(Chance.prototype, 'integer')
      .mockImplementationOnce(options => (options as { min: number }).min);

    try {
      const trace = otelTraceGenerator.trace({ numberOfSpans: 3, numberOfProcesses: 1 });

      expect(trace.rootSpans).toHaveLength(1);
      expect(trace.spans.map(span => span.depth)).toEqual([0, 1, 1]);
    } finally {
      integer.mockRestore();
    }
  });

  it('allows deeper parents without exceeding the requested depth', () => {
    const pickone = vi
      .spyOn(Chance.prototype, 'pickone')
      .mockImplementation(values => (values as string[]).at(-1));

    try {
      const trace = otelTraceGenerator.trace({ numberOfSpans: 5, numberOfProcesses: 1, maxDepth: 3 });

      expect(trace.rootSpans).toHaveLength(1);
      expect(trace.spans.map(span => span.depth)).toEqual([0, 1, 2, 2, 2]);
    } finally {
      pickone.mockRestore();
    }
  });

  it('makes the root cover the full timing window of a multi-span trace', () => {
    const originalInteger = Chance.prototype.integer;
    let offsetCalls = 0;
    const integer = vi.spyOn(Chance.prototype, 'integer').mockImplementation(function (
      this: unknown,
      options
    ) {
      const { min, max } = options as { min: number; max: number };
      if (min === 10000 && max === 5000000) return 10000;
      if (min === 0 && max === 9999) return offsetCalls++ === 0 ? 9999 : 0;
      return originalInteger.call(this, options);
    });

    try {
      const trace = otelTraceGenerator.trace({ numberOfSpans: 3, numberOfProcesses: 1, maxDepth: 2 });
      const root = trace.rootSpans[0];

      expect(trace.rootSpans).toHaveLength(1);
      expect(root.startTime).toBe(trace.startTime);
      expect(root.duration).toBe(10000);
      expect(root.startTime + root.duration).toBe(trace.endTime);
      trace.spans.forEach(span => {
        expect(span.startTime).toBeGreaterThanOrEqual(root.startTime);
        expect(span.startTime + span.duration).toBeLessThanOrEqual(root.startTime + root.duration);
      });
    } finally {
      integer.mockRestore();
    }
  });

  it('allows an explicit maximum depth of one to produce only roots', () => {
    const trace = otelTraceGenerator.trace({ numberOfSpans: 3, numberOfProcesses: 1, maxDepth: 1 });

    expect(trace.rootSpans).toHaveLength(3);
    expect(trace.spans.map(span => span.depth)).toEqual([0, 0, 0]);
  });

  it('returns parsed traces for component tests', () => {
    const trace = otelTraceGenerator.trace({ numberOfSpans: 4, numberOfProcesses: 1, maxDepth: 2 });

    expect(trace.spans).toHaveLength(4);
    expect(trace.spans.map(span => span.kind)).toEqual(Array(4).fill(SpanKind.UNSPECIFIED));
    expect(trace.rootSpans).not.toHaveLength(0);
    expect(
      trace.spans.every(span => span.parentSpanID === undefined || trace.spanMap.has(span.parentSpanID))
    ).toBe(true);
  });

  it('generates the requested number of parsed traces', () => {
    expect(otelTraceGenerator.traces({ numberOfTraces: 2 })).toHaveLength(2);
  });
});
