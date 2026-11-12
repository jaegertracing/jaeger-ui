// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import otelTraceGenerator from './otel-trace-generators';
import { parseOtelTrace } from '../api/v3/parser';

describe('otelTraceGenerator', () => {
  it('generates OTLP wire data that parses into an IOtelTrace', () => {
    const wire = otelTraceGenerator.wireTrace({ numberOfSpans: 3, numberOfProcesses: 2, maxDepth: 2 });
    const trace = parseOtelTrace(wire);

    expect(trace).not.toBeNull();
    expect(trace!.spans).toHaveLength(3);
    expect(trace!.spans.map(span => span.traceID)).toEqual([trace!.traceID, trace!.traceID, trace!.traceID]);
    expect(trace!.spans.every(span => span.resource.serviceName)).toBe(true);
  });

  it('returns parsed traces for component tests', () => {
    const trace = otelTraceGenerator.trace({ numberOfSpans: 4, numberOfProcesses: 1, maxDepth: 2 });

    expect(trace.spans).toHaveLength(4);
    expect(trace.rootSpans).not.toHaveLength(0);
    expect(
      trace.spans.every(span => span.parentSpanID === undefined || trace.spanMap.has(span.parentSpanID))
    ).toBe(true);
  });

  it('generates the requested number of parsed traces', () => {
    expect(otelTraceGenerator.traces({ numberOfTraces: 2 })).toHaveLength(2);
  });
});
