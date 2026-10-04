// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import transformTraceData from './transform-trace-data';
import { SpanData } from '../types/trace';

describe('transformTraceData()', () => {
  const startTime = 1586160015434000;
  const duration = 34000;
  const traceID = 'f77950feed55c1ce91dd8e87896623a6';
  const rootSpanID = 'd4dcb46e95b781f5';
  const rootOperationName = 'rootOperation';
  const serviceName = 'serviceName';
  const trace = (...spans: SpanData[]) => ({
    traceID,
    processes: { p1: { serviceName, tags: [] } },
    spans,
  });
  const spans: SpanData[] = [
    {
      traceID,
      spanID: '41f71485ed2593e4',
      operationName: 'someOperationName',
      references: [{ refType: 'CHILD_OF', spanID: rootSpanID, traceID, span: undefined }],
      startTime,
      duration,
      tags: [],
      logs: [],
      processID: 'p1',
    },
    {
      traceID,
      spanID: '4f623fd33c213cba',
      operationName: 'anotherOperationName',
      references: [{ refType: 'CHILD_OF', spanID: rootSpanID, traceID, span: undefined }],
      startTime: startTime + 100,
      duration,
      tags: [],
      logs: [],
      processID: 'p1',
    },
  ];
  const rootSpanWithoutRefs: SpanData = {
    traceID,
    spanID: rootSpanID,
    operationName: rootOperationName,
    references: [],
    startTime: startTime + 50,
    duration,
    tags: [],
    logs: [],
    processID: 'p1',
  };

  it('should return null for trace without traceID', () => {
    const traceData = { ...trace(...spans), traceID: undefined };

    // @ts-expect-error The input deliberately omits the required trace ID.
    expect(transformTraceData(traceData)).toEqual(null);
  });

  describe('asOtelTrace()', () => {
    it('should implement IOtelTrace interface and memoize the instance', () => {
      const traceData = trace(...spans, rootSpanWithoutRefs);

      const result = transformTraceData(traceData)!;

      // Check if asOtelTrace exists
      expect(typeof result.asOtelTrace).toBe('function');

      // First call - should create instance
      const otelTrace1 = result.asOtelTrace();
      expect(otelTrace1).toBeDefined();
      expect(otelTrace1.traceID).toBe(traceID);
      expect(otelTrace1.spans.length).toBe(3);

      // Second call - should return same instance (memoization)
      const otelTrace2 = result.asOtelTrace();
      expect(otelTrace2).toBe(otelTrace1);
    });
  });
});
