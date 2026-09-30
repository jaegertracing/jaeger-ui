// Copyright (c) 2019 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import transformTraceData, { orderTags, deduplicateTags } from './transform-trace-data';
import { runTraceContractSuite } from './trace-contract-suite';

const legacyCases = import.meta.glob('./trace-contract/*.legacy.json', { eager: true, import: 'default' });

function loadLegacyCase(caseName) {
  const fixture = legacyCases[`./trace-contract/${caseName}.legacy.json`];
  if (!fixture) throw new Error(`Missing legacy trace contract case: ${caseName}`);
  return structuredClone(fixture);
}

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
    expect(
      orderTags([
        { key: 'a', value: 1 },
        { key: 'a', value: 2 },
      ])
    ).toEqual([
      { key: 'a', value: 1 },
      { key: 'a', value: 2 },
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
    expect(tagsInfo.warnings).toEqual(['Duplicate tag key="b.ip" value="8.8.4.4"']);
  });

  it('collapses repeated duplicates into a single warning and keeps the first', () => {
    const tagsInfo = deduplicateTags([
      { key: 'x', value: 'a' },
      { key: 'x', value: 'a' },
      { key: 'x', value: 'a' },
    ]);

    expect(tagsInfo.tags).toEqual([{ key: 'x', value: 'a' }]);
    expect(tagsInfo.warnings).toEqual(['Duplicate tag key="x" value="a"']);
  });

  it('does not collide when key or value contains a colon', () => {
    const tagsInfo = deduplicateTags([
      { key: 'a:b', value: 'c' },
      { key: 'a', value: 'b:c' },
    ]);

    expect(tagsInfo.tags).toHaveLength(2);
    expect(tagsInfo.warnings).toEqual([]);
  });

  it('reports both duplicates when colliding key/value pairs are each duplicated', () => {
    const tagsInfo = deduplicateTags([
      { key: 'a:b', value: 'c' },
      { key: 'a:b', value: 'c' },
      { key: 'a', value: 'b:c' },
      { key: 'a', value: 'b:c' },
    ]);

    expect(tagsInfo.tags).toEqual([
      { key: 'a:b', value: 'c' },
      { key: 'a', value: 'b:c' },
    ]);
    // Both duplicated pairs are tracked separately; neither warning is dropped.
    expect(tagsInfo.warnings).toEqual([
      'Duplicate tag key="a:b" value="c"',
      'Duplicate tag key="a" value="b:c"',
    ]);
  });

  it('preserves distinct duplicate warnings when mixed-type values stringify the same', () => {
    const tagsInfo = deduplicateTags([
      { key: 'x', value: 1 },
      { key: 'x', value: 1 },
      { key: 'x', value: '1' },
      { key: 'x', value: '1' },
    ]);

    expect(tagsInfo.tags).toEqual([
      { key: 'x', value: 1 },
      { key: 'x', value: '1' },
    ]);
    expect(tagsInfo.warnings).toEqual(['Duplicate tag key="x" value="1"', 'Duplicate tag key="x" value="1"']);
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

  it('should not produce a negative duration for a trace with only a parent cycle', () => {
    const result = transformTraceData(loadLegacyCase('parent-cycle')).asOtelTrace();
    expect(result.spans).toHaveLength(0);
    expect(result.duration).toBe(0);
    expect(result.startTime).toBe(0);
    expect(result.endTime).toBe(0);
  });
  it('should keep and repair sibling spans that have no usable startTime', () => {
    // NB: this asserts the observable outcome (no span dropped, all startTimes
    // finite, real sibling ordered last). It does NOT prove the NaN-comparator
    // ordering issue is gone — that divergence is engine-defined (V8 leaves a
    // NaN-comparator order unchanged), so it cannot be reproduced deterministically
    // here. Repairing before the sort addresses it by construction.
    const realStart = 1784570820629325;
    const realRoot = {
      traceID,
      spanID: rootSpanID,
      operationName: rootOperationName,
      references: [],
      startTime: realStart,
      duration: 1000,
      tags: [],
      logs: [],
      processID: 'p1',
    };
    const missingSibling1 = {
      traceID,
      spanID: 'missing1',
      operationName: 'missing1',
      references: [{ refType: 'CHILD_OF', traceID, spanID: rootSpanID }],
      duration: 10,
      tags: [],
      logs: [],
      processID: 'p1',
    };
    const nanSibling = {
      traceID,
      spanID: 'nan',
      operationName: 'nan',
      references: [{ refType: 'CHILD_OF', traceID, spanID: rootSpanID }],
      startTime: NaN,
      duration: 20,
      tags: [],
      logs: [],
      processID: 'p1',
    };
    const realSibling = {
      traceID,
      spanID: 'real',
      operationName: 'real',
      references: [{ refType: 'CHILD_OF', traceID, spanID: rootSpanID }],
      startTime: realStart + 500,
      duration: 30,
      tags: [],
      logs: [],
      processID: 'p1',
    };

    const result = transformTraceData({
      traceID,
      processes,
      spans: [realRoot, missingSibling1, nanSibling, realSibling],
    }).asOtelTrace();

    // Every span is kept and has a finite startTime; none was lost or left NaN.
    expect(result.spans.length).toBe(4);
    expect(result.spans.every(span => Number.isFinite(span.startTime))).toBe(true);
    // Repaired siblings inherit the root's start (realStart), so they sort ahead
    // of the real sibling (realStart + 500), which remains last.
    expect(result.spanMap.get('real').startTime).toBe(realStart + 500);
    expect(result.spans[result.spans.length - 1].spanID).toBe('real');
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
      expect(otelTrace1.traceID).toBe(traceID);
      expect(otelTrace1.spans.length).toBe(3);

      // Second call - should return same instance (memoization)
      const otelTrace2 = result.asOtelTrace();
      expect(otelTrace2).toBe(otelTrace1);
    });
  });
});

runTraceContractSuite({
  name: 'legacy transformer',
  load: loadLegacyCase,
  parse(fixture) {
    return transformTraceData(fixture).asOtelTrace();
  },
});
