// Copyright (c) 2019 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import traceGenerator from '../demo/trace-generators';
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

  it('should render the whole tree when every span reports startTime 0', () => {
    const zeroRoot = {
      traceID,
      spanID: rootSpanID,
      operationName: rootOperationName,
      references: [],
      startTime: 0,
      duration: 100,
      tags: [],
      logs: [],
      processID: 'p1',
    };
    const zeroChild = {
      traceID,
      spanID: 'zeroChild',
      operationName: 'childOp',
      references: [{ refType: 'CHILD_OF', traceID, spanID: rootSpanID }],
      startTime: 0,
      duration: 50,
      tags: [],
      logs: [],
      processID: 'p1',
    };
    const noStartTimeChild = {
      traceID,
      spanID: 'missingStartTime',
      operationName: 'missingStartOp',
      references: [{ refType: 'CHILD_OF', traceID, spanID: rootSpanID }],
      duration: 10,
      tags: [],
      logs: [],
      processID: 'p1',
    };

    const result = transformTraceData({
      traceID,
      processes,
      spans: [zeroRoot, zeroChild, noStartTimeChild],
    });

    // No span is dropped: startTime 0 (epoch) and a missing startTime are both
    // treated as "no usable timestamp" and repaired rather than filtered out.
    expect(result.spans.map(span => span.spanID)).toEqual([rootSpanID, 'zeroChild', 'missingStartTime']);
    expect(result.startTime).toBe(0);
    expect(result.spans.every(span => span.startTime === 0)).toBe(true);
    expect(result.spanMap.get(rootSpanID).hasChildren).toBe(true);
  });

  it('should clamp spans with no usable startTime to their parent instead of stretching the timeline', () => {
    // A realistic microsecond epoch timestamp; a stray 0/missing startTime here
    // would otherwise pin the trace start ~56 years earlier and squash the real
    // spans into an invisible sliver.
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
    const zeroChild = {
      traceID,
      spanID: 'zeroChild',
      operationName: 'childOp',
      references: [{ refType: 'CHILD_OF', traceID, spanID: rootSpanID }],
      startTime: 0,
      duration: 200,
      tags: [],
      logs: [],
      processID: 'p1',
    };
    const missingChild = {
      traceID,
      spanID: 'missingChild',
      operationName: 'missingOp',
      references: [{ refType: 'CHILD_OF', traceID, spanID: rootSpanID }],
      duration: 300,
      tags: [],
      logs: [],
      processID: 'p1',
    };

    const result = transformTraceData({
      traceID,
      processes,
      spans: [realRoot, zeroChild, missingChild],
    });

    expect(result.startTime).toBe(realStart);
    // The broken children inherit the parent's startTime, so they sit at the
    // start of the trace rather than 56 years before it.
    expect(result.spanMap.get('zeroChild').startTime).toBe(realStart);
    expect(result.spanMap.get('missingChild').startTime).toBe(realStart);
    expect(result.spanMap.get('zeroChild').relativeStartTime).toBe(0);
    // Trace duration reflects the real root span, not an epoch-wide range.
    expect(result.duration).toBe(1000);
  });

  it('should inherit a repaired startTime transitively down a chain of broken spans', () => {
    // root (real) -> middle (0) -> leaf (missing). The middle span is repaired
    // to the root's startTime first; the leaf must then inherit that repaired
    // value, not undefined/0. This exercises the DFS ordering invariant that
    // lets processSpan read an already-fixed parent.startTime.
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
    const brokenMiddle = {
      traceID,
      spanID: 'brokenMiddle',
      operationName: 'middleOp',
      references: [{ refType: 'CHILD_OF', traceID, spanID: rootSpanID }],
      startTime: 0,
      duration: 400,
      tags: [],
      logs: [],
      processID: 'p1',
    };
    const brokenLeaf = {
      traceID,
      spanID: 'brokenLeaf',
      operationName: 'leafOp',
      references: [{ refType: 'CHILD_OF', traceID, spanID: 'brokenMiddle' }],
      duration: 100,
      tags: [],
      logs: [],
      processID: 'p1',
    };

    const result = transformTraceData({
      traceID,
      processes,
      spans: [realRoot, brokenMiddle, brokenLeaf],
    });

    expect(result.startTime).toBe(realStart);
    expect(result.spanMap.get('brokenMiddle').startTime).toBe(realStart);
    // The leaf inherits the middle span's repaired startTime, not undefined.
    expect(result.spanMap.get('brokenLeaf').startTime).toBe(realStart);
    expect(result.spanMap.get('brokenLeaf').relativeStartTime).toBe(0);
    expect(result.duration).toBe(1000);
  });

  it('should not produce a negative duration for a trace with spans but no root', () => {
    // Two spans referencing each other form a cycle, so neither is a root and
    // nothing is reachable by the traversal. The time range must not be left at
    // its sentinel value, which would yield a negative duration.
    const spanA = {
      traceID,
      spanID: 'a',
      operationName: 'a',
      references: [{ refType: 'CHILD_OF', traceID, spanID: 'b' }],
      startTime,
      duration,
      tags: [],
      logs: [],
      processID: 'p1',
    };
    const spanB = {
      traceID,
      spanID: 'b',
      operationName: 'b',
      references: [{ refType: 'CHILD_OF', traceID, spanID: 'a' }],
      startTime,
      duration,
      tags: [],
      logs: [],
      processID: 'p1',
    };

    const result = transformTraceData({
      traceID,
      processes,
      spans: [spanA, spanB],
    });

    expect(result.spans.length).toBe(0);
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
    });

    // Every span is kept and has a finite startTime; none was lost or left NaN.
    expect(result.spans.length).toBe(4);
    expect(result.spans.every(span => Number.isFinite(span.startTime))).toBe(true);
    // Repaired siblings inherit the root's start (realStart), so they sort ahead
    // of the real sibling (realStart + 500), which remains last.
    expect(result.spanMap.get('real').startTime).toBe(realStart + 500);
    expect(result.spans[result.spans.length - 1].spanID).toBe('real');
  });

  it('should fall back to 0 for a root with no usable startTime and propagate it to children', () => {
    const brokenRoot = {
      traceID,
      spanID: rootSpanID,
      operationName: rootOperationName,
      references: [],
      duration: 500,
      tags: [],
      logs: [],
      processID: 'p1',
    };
    const child = {
      traceID,
      spanID: 'child',
      operationName: 'childOp',
      references: [{ refType: 'CHILD_OF', traceID, spanID: rootSpanID }],
      startTime: 0,
      duration: 100,
      tags: [],
      logs: [],
      processID: 'p1',
    };

    const result = transformTraceData({
      traceID,
      processes,
      spans: [brokenRoot, child],
    });

    // A root with no parent to inherit from falls back to 0; the child inherits
    // that finite 0 rather than becoming undefined.
    expect(result.spanMap.get(rootSpanID).startTime).toBe(0);
    expect(result.spanMap.get('child').startTime).toBe(0);
    expect(result.startTime).toBe(0);
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
      expect(otelTrace1.traceID).toBe(traceID);
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

    it('should calculate depth and sort spans in DFS order', () => {
      // Create a linear trace: Root -> Child -> GrandChild
      // spans[0] is 'someOperationName', referencing rootSpanID
      // rootSpanWithoutRefs is the root (start + 50)
      // spans[0] starts at startTime (0 relative to trace start? No, trace start is startTime).

      // Let's use a fresh set of spans to be clear about order
      const tStart = 1000;
      const root = { ...rootSpanWithoutRefs, spanID: 'root', startTime: tStart, references: [] };
      const child1 = {
        ...spans[0],
        spanID: 'child1',
        startTime: tStart + 10,
        references: [{ refType: 'CHILD_OF', traceID, spanID: 'root' }],
      };
      const child2 = {
        ...spans[1],
        spanID: 'child2',
        startTime: tStart + 20,
        references: [{ refType: 'CHILD_OF', traceID, spanID: 'root' }],
      };
      const grandChild1 = {
        ...spans[0],
        spanID: 'grandChild1',
        startTime: tStart + 15,
        references: [{ refType: 'CHILD_OF', traceID, spanID: 'child1' }],
      };

      // Tree structure:
      // root (0)
      //   -> child1 (10)
      //      -> grandChild1 (15)
      //   -> child2 (20)

      // Expected DFS order: root, child1, grandChild1, child2

      const traceData = {
        traceID,
        processes,
        spans: [root, child1, child2, grandChild1],
      };

      const result = transformTraceData(traceData);

      // Check depth
      const map = result.spanMap;
      expect(map.get('root').depth).toBe(0);
      expect(map.get('child1').depth).toBe(1);
      expect(map.get('grandChild1').depth).toBe(2);
      expect(map.get('child2').depth).toBe(1);

      // Check hasChildren
      expect(map.get('root').hasChildren).toBe(true);
      expect(map.get('child1').hasChildren).toBe(true);
      expect(map.get('grandChild1').hasChildren).toBe(false);
      expect(map.get('child2').hasChildren).toBe(false);

      // Check flat spans order (DFS)
      const ids = result.spans.map(s => s.spanID);
      expect(ids).toEqual(['root', 'child1', 'grandChild1', 'child2']);
    });
  });

  it('populates subsidiarilyReferencedBy for spans with multiple references', () => {
    const multiRefTrace = traceGenerator.trace({ numberOfSpans: 7, maxDepth: 3, spansPerLevel: 4 });
    const { traceID, spanID: rootSpanId } = multiRefTrace.spans[0];
    const candidates = multiRefTrace.spans.filter(
      span => span.references.length > 0 && span.references[0].spanID !== rootSpanId
    );
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    const [willGainRef, willNotChange] = candidates;
    const { spanID: existingRefID } = willGainRef.references[0];
    const { spanID: willBeReferencedID } = willNotChange.references[0];

    willGainRef.references.push({ refType: 'CHILD_OF', traceID, spanID: willBeReferencedID });

    const tTrace = transformTraceData(multiRefTrace);
    const multiReference = tTrace.spans.filter(span => span.references && span.references.length > 1);

    expect(multiReference.length).toEqual(1);
    expect(new Set(multiReference[0].references)).toEqual(
      new Set([
        expect.objectContaining({ spanID: willBeReferencedID }),
        expect.objectContaining({ spanID: existingRefID }),
      ])
    );
    const hasReferral = tTrace.spans.filter(
      span => span.subsidiarilyReferencedBy && span.subsidiarilyReferencedBy.length > 0
    );
    expect(hasReferral.length).toEqual(1);
    expect(new Set(hasReferral[0].subsidiarilyReferencedBy)).toEqual(
      new Set([expect.objectContaining({ spanID: willGainRef.spanID })])
    );
  });
});
