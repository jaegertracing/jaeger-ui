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
    processID: 'p1',
  };

  const rootSpanWithoutRefs = {
    traceID,
    spanID: rootSpanID,
    operationName: rootOperationName,
    startTime: startTime + 50,
    duration,
    tags: [],
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
});
