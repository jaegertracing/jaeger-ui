// Copyright (c) 2019 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import transformTraceData, { orderTags, deduplicateTags } from './transform-trace-data';

describe('orderTags()', () => {
  it('correctly orders tags', () => {
    const orderedTags = orderTags(
      [
        { key: 'b.ip', value: '8.8.4.4' },
        { key: 'http.Status_code', value: '200' },
        { key: 'z.ip', value: '8.8.8.16' },
        { key: 'a.ip', value: '8.8.8.8' },
        { key: 'http.message', value: 'ok' },
      ],
      ['z.', 'a.', 'HTTP.']
    );
    expect(orderedTags).toEqual([
      { key: 'z.ip', value: '8.8.8.16' },
      { key: 'a.ip', value: '8.8.8.8' },
      { key: 'http.message', value: 'ok' },
      { key: 'http.Status_code', value: '200' },
      { key: 'b.ip', value: '8.8.4.4' },
    ]);
  });
});

describe('deduplicateTags()', () => {
  it('deduplicates tags', () => {
    const tagsInfo = deduplicateTags([
      { key: 'b.ip', value: '8.8.4.4' },
      { key: 'b.ip', value: '8.8.8.8' },
      { key: 'b.ip', value: '8.8.4.4' },
      { key: 'a.ip', value: '8.8.8.8' },
    ]);

    expect(tagsInfo.tags).toEqual([
      { key: 'b.ip', value: '8.8.4.4' },
      { key: 'b.ip', value: '8.8.8.8' },
      { key: 'a.ip', value: '8.8.8.8' },
    ]);
    expect(tagsInfo.warnings).toEqual(['Duplicate tag "b.ip:8.8.4.4"']);
  });
});

describe('transformTraceData()', () => {
  const startTime = 1586160015434000;
  const duration = 34000;
  const traceID = 'f77950feed55c1ce91dd8e87896623a6';
  const rootSpanID = 'd4dcb46e95b781f5';
  const rootOperationName = 'rootOperation';
  const serviceName = 'serviceName';

  const spans = [
    {
      traceID,
      spanID: '41f71485ed2593e4',
      operationName: 'someOperationName',
      references: [
        {
          refType: 'CHILD_OF',
          traceID,
          spanID: rootSpanID,
        },
      ],
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
      references: [
        {
          refType: 'CHILD_OF',
          traceID,
          spanID: rootSpanID,
        },
      ],
      startTime: startTime + 100,
      duration,
      tags: [],
      logs: [],
      processID: 'p1',
    },
  ];

  const rootSpanWithMissingRef = {
    traceID,
    spanID: rootSpanID,
    operationName: rootOperationName,
    references: [
      {
        refType: 'CHILD_OF',
        traceID,
        spanID: 'missingSpanId',
      },
    ],
    startTime: startTime + 50,
    duration,
    tags: [],
    logs: [],
    processID: 'p1',
  };

  const rootSpanWithoutRefs = {
    traceID,
    spanID: rootSpanID,
    operationName: rootOperationName,
    startTime: startTime + 50,
    duration,
    tags: [],
    logs: [],
    processID: 'p1',
  };

  const processes = {
    p1: {
      serviceName,
      tags: [],
    },
  };

  it('should return null for trace without traceID', () => {
    const traceData = {
      traceID: undefined,
      processes,
      spans,
    };

    expect(transformTraceData(traceData)).toEqual(null);
  });

  it('should return trace data with correct traceName based on root span with missing ref', () => {
    const traceData = {
      traceID,
      processes,
      spans: [...spans, rootSpanWithMissingRef],
    };

    expect(transformTraceData(traceData).traceName).toEqual(`${serviceName}: ${rootOperationName}`);
  });

  it('should return trace data with correct traceName based on root span without any refs', () => {
    const traceData = {
      traceID,
      processes,
      spans: [...spans, rootSpanWithoutRefs],
    };

    expect(transformTraceData(traceData).traceName).toEqual(`${serviceName}: ${rootOperationName}`);
  });

  it('should detect orphan spans when parent span is missing', () => {
    const traceData = {
      traceID,
      processes,
      spans: [...spans, rootSpanWithMissingRef],
    };

    const result = transformTraceData(traceData);
    // rootSpanWithMissingRef references 'missingSpanId' which doesn't exist,
    // and the two other spans reference rootSpanID which exists
    expect(result.orphanSpanCount).toBe(1);
  });

  it('should detect multiple orphan spans', () => {
    const orphanSpan1 = {
      traceID,
      spanID: 'orphan1',
      operationName: 'orphanOp1',
      references: [{ refType: 'CHILD_OF', traceID, spanID: 'nonexistent1' }],
      startTime,
      duration,
      tags: [],
      processID: 'p1',
    };
    const orphanSpan2 = {
      traceID,
      spanID: 'orphan2',
      operationName: 'orphanOp2',
      references: [{ refType: 'CHILD_OF', traceID, spanID: 'nonexistent2' }],
      startTime: startTime + 200,
      duration,
      tags: [],
      processID: 'p1',
    };

    const traceData = {
      traceID,
      processes,
      spans: [...spans, rootSpanWithoutRefs, orphanSpan1, orphanSpan2],
    };

    const result = transformTraceData(traceData);
    expect(result.orphanSpanCount).toBe(2);
  });

  it('should not flag orphan spans when all parents exist', () => {
    const traceData = {
      traceID,
      processes,
      spans: [...spans, rootSpanWithoutRefs],
    };

    const result = transformTraceData(traceData);
    expect(result.orphanSpanCount).toBe(0);
  });

  it('should handle FOLLOWS_FROM references for orphan detection', () => {
    const followsFromOrphan = {
      traceID,
      spanID: 'followsOrphan',
      operationName: 'followsOrphanOp',
      references: [{ refType: 'FOLLOWS_FROM', traceID, spanID: 'nonexistent' }],
      startTime,
      duration,
      tags: [],
      processID: 'p1',
    };

    const traceData = {
      traceID,
      processes,
      spans: [rootSpanWithoutRefs, followsFromOrphan],
    };

    const result = transformTraceData(traceData);
    expect(result.orphanSpanCount).toBe(1);
  });

  describe('asOtelTrace()', () => {
    it('should implement IOtelTrace interface and memoize the instance', () => {
      const traceData = {
        traceID,
        processes,
        spans: [...spans, rootSpanWithoutRefs],
      };

      const result = transformTraceData(traceData);

      // Check if asOtelTrace exists
      expect(typeof result.asOtelTrace).toBe('function');

      // First call - should create instance
      const otelTrace1 = result.asOtelTrace();
      expect(otelTrace1).toBeDefined();
      expect(otelTrace1.traceId).toBe(traceID);
      expect(otelTrace1.spans.length).toBe(3);

      // Second call - should return same instance (memoization)
      const otelTrace2 = result.asOtelTrace();
      expect(otelTrace2).toBe(otelTrace1);
    });
  });

  describe('spanMap, rootSpans, and childSpans collections', () => {
    it('should build spanMap with all spans', () => {
      const traceData = {
        traceID,
        processes,
        spans: [...spans, rootSpanWithoutRefs],
      };

      const result = transformTraceData(traceData);

      // spanMap should contain all spans
      expect(result.spanMap).toBeInstanceOf(Map);
      expect(result.spanMap.size).toBe(3);
      expect(result.spanMap.get(rootSpanID)).toBeDefined();
      expect(result.spanMap.get(spans[0].spanID)).toBeDefined();
      expect(result.spanMap.get(spans[1].spanID)).toBeDefined();
    });

    it('should identify root spans correctly', () => {
      const traceData = {
        traceID,
        processes,
        spans: [...spans, rootSpanWithoutRefs],
      };

      const result = transformTraceData(traceData);

      // Should have one root span (rootSpanWithoutRefs)
      expect(result.rootSpans).toBeInstanceOf(Array);
      expect(result.rootSpans.length).toBe(1);
      expect(result.rootSpans[0].spanID).toBe(rootSpanID);
      expect(result.rootSpans[0].operationName).toBe(rootOperationName);
    });

    it('should build childSpans arrays correctly', () => {
      const traceData = {
        traceID,
        processes,
        spans: [...spans, rootSpanWithoutRefs],
      };

      const result = transformTraceData(traceData);

      // Root span should have two children
      const rootSpan = result.spanMap.get(rootSpanID);
      expect(rootSpan.childSpans).toBeInstanceOf(Array);
      expect(rootSpan.childSpans.length).toBe(2);

      // Children should be sorted by start time
      expect(rootSpan.childSpans[0].spanID).toBe(spans[0].spanID);
      expect(rootSpan.childSpans[1].spanID).toBe(spans[1].spanID);

      // Child spans should have no children
      const childSpan1 = result.spanMap.get(spans[0].spanID);
      const childSpan2 = result.spanMap.get(spans[1].spanID);
      expect(childSpan1.childSpans).toEqual([]);
      expect(childSpan2.childSpans).toEqual([]);
    });

    it('should handle orphan spans as root spans', () => {
      const traceData = {
        traceID,
        processes,
        spans: [...spans, rootSpanWithMissingRef],
      };

      const result = transformTraceData(traceData);

      // rootSpanWithMissingRef references a missing parent, so it should be a root span
      expect(result.rootSpans.length).toBe(1);
      expect(result.rootSpans[0].spanID).toBe(rootSpanID);

      // The root span should still have its two children
      const rootSpan = result.spanMap.get(rootSpanID);
      expect(rootSpan.childSpans.length).toBe(2);
    });

    it('should handle multiple root spans', () => {
      const secondRoot = {
        traceID,
        spanID: 'secondRoot',
        operationName: 'secondRootOp',
        startTime: startTime + 100,
        duration,
        tags: [],
        logs: [],
        processID: 'p1',
      };

      const traceData = {
        traceID,
        processes,
        spans: [rootSpanWithoutRefs, secondRoot],
      };

      const result = transformTraceData(traceData);

      // Should have two root spans
      expect(result.rootSpans.length).toBe(2);
      expect(result.rootSpans[0].spanID).toBe(rootSpanID);
      expect(result.rootSpans[1].spanID).toBe(secondRoot.spanID);
    });

    it('should maintain span references in childSpans array', () => {
      const traceData = {
        traceID,
        processes,
        spans: [...spans, rootSpanWithoutRefs],
      };

      const result = transformTraceData(traceData);

      const rootSpan = result.spanMap.get(rootSpanID);

      // childSpans should contain actual span objects, not IDs
      rootSpan.childSpans.forEach(child => {
        expect(child.spanID).toBeDefined();
        expect(child.operationName).toBeDefined();
        expect(child).toBe(result.spanMap.get(child.spanID));
      });
    });
  });
});
