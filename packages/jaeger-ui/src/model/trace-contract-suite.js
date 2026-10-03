// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import transformTraceData from './transform-trace-data';
import getConfig from '../utils/config/get-config';

export function runTraceContractSuite(pipeline) {
  // Tag deduplication and ordering run inside the pipeline, so these two
  // stand-ins keep the helper signatures and read the result back from the
  // parsed span. topTagPrefixes comes from the UI config, which is memoized.
  const parseSpanWithTags = (tags, topTagPrefixes) => {
    window.getJaegerUiConfig = () => ({ topTagPrefixes });
    getConfig.clear();
    try {
      // getTraceName() memoizes by trace ID, so this trace must not share one with the tests below.
      const traceID = '0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f';
      const input = pipeline.materialize({
        traceID,
        serviceName: 'svc',
        spans: [{ spanID: 'd4dcb46e95b781f5', operationName: 'op', startTime: 1, duration: 1, tags }],
      });
      return pipeline.parse(input).spans[0];
    } finally {
      window.getJaegerUiConfig = undefined;
      getConfig.clear();
    }
  };
  const orderTags = (tags, topTagPrefixes) => parseSpanWithTags(tags, topTagPrefixes).attributes.entries();
  const deduplicateTags = tags => {
    const span = parseSpanWithTags(tags);
    // The pipeline also orders the tags; put them back in input order so the
    // assertions below observe deduplication alone.
    const inputIndex = tag => tags.findIndex(t => t.key === tag.key && t.value === tag.value);
    const deduplicated = [...span.attributes.entries()].sort((a, b) => inputIndex(a) - inputIndex(b));
    return { tags: deduplicated, warnings: span.warnings };
  };

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
      expect(tagsInfo.warnings).toEqual([
        'Duplicate tag key="x" value="1"',
        'Duplicate tag key="x" value="1"',
      ]);
    });
  });

  describe('transformTraceData()', () => {
    const startTime = 1586160015434000;
    const duration = 34000;
    const traceID = 'f77950feed55c1ce91dd8e87896623a6';
    const rootSpanID = 'd4dcb46e95b781f5';
    const rootOperationName = 'rootOperation';
    const serviceName = 'serviceName';

    // Each pipeline renders the span specs into the wire format it parses.
    const trace = (...spans) => pipeline.materialize({ traceID, serviceName, spans });

    const spans = [
      {
        spanID: '41f71485ed2593e4',
        operationName: 'someOperationName',
        parentSpanID: rootSpanID,
        startTime,
        duration,
      },
      {
        spanID: '4f623fd33c213cba',
        operationName: 'anotherOperationName',
        parentSpanID: rootSpanID,
        startTime: startTime + 100,
        duration,
      },
    ];

    const rootSpanWithMissingRef = {
      spanID: rootSpanID,
      operationName: rootOperationName,
      parentSpanID: 'missingSpanId',
      startTime: startTime + 50,
      duration,
    };

    const rootSpanWithoutRefs = {
      spanID: rootSpanID,
      operationName: rootOperationName,
      startTime: startTime + 50,
      duration,
    };

    it.skipIf(!pipeline.isLegacy)('should return null for trace without traceID', () => {
      const traceData = { ...trace(...spans), traceID: undefined };

      expect(transformTraceData(traceData)).toEqual(null);
    });

    it('should return trace data with correct traceName based on root span with missing ref', () => {
      const traceData = trace(...spans, rootSpanWithMissingRef);

      expect(pipeline.parse(traceData).traceName).toEqual(`${serviceName}: ${rootOperationName}`);
    });

    it('should return trace data with correct traceName based on root span without any refs', () => {
      const traceData = trace(...spans, rootSpanWithoutRefs);

      expect(pipeline.parse(traceData).traceName).toEqual(`${serviceName}: ${rootOperationName}`);
    });

    it('should render the whole tree when every span reports startTime 0', () => {
      const zeroRoot = {
        spanID: rootSpanID,
        operationName: rootOperationName,
        startTime: 0,
        duration: 100,
      };
      const zeroChild = {
        spanID: 'zeroChild',
        operationName: 'childOp',
        parentSpanID: rootSpanID,
        startTime: 0,
        duration: 50,
      };
      const noStartTimeChild = {
        spanID: 'missingStartTime',
        operationName: 'missingStartOp',
        parentSpanID: rootSpanID,
        duration: 10,
      };

      const result = pipeline.parse(trace(zeroRoot, zeroChild, noStartTimeChild));

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
        spanID: rootSpanID,
        operationName: rootOperationName,
        startTime: realStart,
        duration: 1000,
      };
      const zeroChild = {
        spanID: 'zeroChild',
        operationName: 'childOp',
        parentSpanID: rootSpanID,
        startTime: 0,
        duration: 200,
      };
      const missingChild = {
        spanID: 'missingChild',
        operationName: 'missingOp',
        parentSpanID: rootSpanID,
        duration: 300,
      };

      const result = pipeline.parse(trace(realRoot, zeroChild, missingChild));

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
        spanID: rootSpanID,
        operationName: rootOperationName,
        startTime: realStart,
        duration: 1000,
      };
      const brokenMiddle = {
        spanID: 'brokenMiddle',
        operationName: 'middleOp',
        parentSpanID: rootSpanID,
        startTime: 0,
        duration: 400,
      };
      const brokenLeaf = {
        spanID: 'brokenLeaf',
        operationName: 'leafOp',
        parentSpanID: 'brokenMiddle',
        duration: 100,
      };

      const result = pipeline.parse(trace(realRoot, brokenMiddle, brokenLeaf));

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
      const spanA = { spanID: 'a', operationName: 'a', parentSpanID: 'b', startTime, duration };
      const spanB = { spanID: 'b', operationName: 'b', parentSpanID: 'a', startTime, duration };

      const result = pipeline.parse(trace(spanA, spanB));

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
        spanID: rootSpanID,
        operationName: rootOperationName,
        startTime: realStart,
        duration: 1000,
      };
      const missingSibling1 = {
        spanID: 'missing1',
        operationName: 'missing1',
        parentSpanID: rootSpanID,
        duration: 10,
      };
      const nanSibling = {
        spanID: 'nan',
        operationName: 'nan',
        parentSpanID: rootSpanID,
        startTime: NaN,
        duration: 20,
      };
      const realSibling = {
        spanID: 'real',
        operationName: 'real',
        parentSpanID: rootSpanID,
        startTime: realStart + 500,
        duration: 30,
      };

      const result = pipeline.parse(trace(realRoot, missingSibling1, nanSibling, realSibling));

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
        spanID: rootSpanID,
        operationName: rootOperationName,
        duration: 500,
      };
      const child = {
        spanID: 'child',
        operationName: 'childOp',
        parentSpanID: rootSpanID,
        startTime: 0,
        duration: 100,
      };

      const result = pipeline.parse(trace(brokenRoot, child));

      // A root with no parent to inherit from falls back to 0; the child inherits
      // that finite 0 rather than becoming undefined.
      expect(result.spanMap.get(rootSpanID).startTime).toBe(0);
      expect(result.spanMap.get('child').startTime).toBe(0);
      expect(result.startTime).toBe(0);
    });

    it('should detect orphan spans when parent span is missing', () => {
      const traceData = trace(...spans, rootSpanWithMissingRef);

      const result = pipeline.parse(traceData);
      // rootSpanWithMissingRef references 'missingSpanId' which doesn't exist,
      // and the two other spans reference rootSpanID which exists
      expect(result.orphanSpanCount).toBe(1);
    });

    it('should detect multiple orphan spans', () => {
      const orphanSpan1 = {
        spanID: 'orphan1',
        operationName: 'orphanOp1',
        parentSpanID: 'nonexistent1',
        startTime: startTime,
        duration,
      };
      const orphanSpan2 = {
        spanID: 'orphan2',
        operationName: 'orphanOp2',
        parentSpanID: 'nonexistent2',
        startTime: startTime + 200,
        duration,
      };

      const traceData = trace(...spans, rootSpanWithoutRefs, orphanSpan1, orphanSpan2);

      const result = pipeline.parse(traceData);
      expect(result.orphanSpanCount).toBe(2);
    });

    it('should not flag orphan spans when all parents exist', () => {
      const traceData = trace(...spans, rootSpanWithoutRefs);

      const result = pipeline.parse(traceData);
      expect(result.orphanSpanCount).toBe(0);
    });

    it('should handle FOLLOWS_FROM references for orphan detection', () => {
      const followsFromOrphan = {
        spanID: 'followsOrphan',
        operationName: 'followsOrphanOp',
        references: [{ refType: 'FOLLOWS_FROM', spanID: 'nonexistent' }],
        startTime: startTime,
        duration,
      };

      const traceData = trace(rootSpanWithoutRefs, followsFromOrphan);

      const result = pipeline.parse(traceData);
      expect(result.orphanSpanCount).toBe(1);
    });

    describe.skipIf(!pipeline.isLegacy)('asOtelTrace()', () => {
      it('should implement IOtelTrace interface and memoize the instance', () => {
        const traceData = trace(...spans, rootSpanWithoutRefs);

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
        const traceData = trace(...spans, rootSpanWithoutRefs);

        const result = pipeline.parse(traceData);

        // spanMap should contain all spans
        expect(result.spanMap).toBeInstanceOf(Map);
        expect(result.spanMap.size).toBe(3);
        expect(result.spanMap.get(rootSpanID)).toBeDefined();
        expect(result.spanMap.get(spans[0].spanID)).toBeDefined();
        expect(result.spanMap.get(spans[1].spanID)).toBeDefined();
      });

      it('should identify root spans correctly', () => {
        const traceData = trace(...spans, rootSpanWithoutRefs);

        const result = pipeline.parse(traceData);

        // Should have one root span (rootSpanWithoutRefs)
        expect(result.rootSpans).toBeInstanceOf(Array);
        expect(result.rootSpans.length).toBe(1);
        expect(result.rootSpans[0].spanID).toBe(rootSpanID);
        expect(result.rootSpans[0].name).toBe(rootOperationName);
      });

      it('should build childSpans arrays correctly', () => {
        const traceData = trace(...spans, rootSpanWithoutRefs);

        const result = pipeline.parse(traceData);

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
        const traceData = trace(...spans, rootSpanWithMissingRef);

        const result = pipeline.parse(traceData);

        // rootSpanWithMissingRef references a missing parent, so it should be a root span
        expect(result.rootSpans.length).toBe(1);
        expect(result.rootSpans[0].spanID).toBe(rootSpanID);

        // The root span should still have its two children
        const rootSpan = result.spanMap.get(rootSpanID);
        expect(rootSpan.childSpans.length).toBe(2);
      });

      it('should handle multiple root spans', () => {
        const secondRoot = {
          spanID: 'secondRoot',
          operationName: 'secondRootOp',
          startTime: startTime + 100,
          duration,
        };

        const traceData = trace(rootSpanWithoutRefs, secondRoot);

        const result = pipeline.parse(traceData);

        // Should have two root spans
        expect(result.rootSpans.length).toBe(2);
        expect(result.rootSpans[0].spanID).toBe(rootSpanID);
        expect(result.rootSpans[1].spanID).toBe(secondRoot.spanID);
      });

      it('should maintain span references in childSpans array', () => {
        const traceData = trace(...spans, rootSpanWithoutRefs);

        const result = pipeline.parse(traceData);

        const rootSpan = result.spanMap.get(rootSpanID);

        // childSpans should contain actual span objects, not IDs
        rootSpan.childSpans.forEach(child => {
          expect(child.spanID).toBeDefined();
          expect(child.name).toBeDefined();
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
        const root = { ...rootSpanWithoutRefs, spanID: 'root', startTime: tStart };
        const child1 = { ...spans[0], spanID: 'child1', startTime: tStart + 10, parentSpanID: 'root' };
        const child2 = { ...spans[1], spanID: 'child2', startTime: tStart + 20, parentSpanID: 'root' };
        const grandChild1 = {
          ...spans[0],
          spanID: 'grandChild1',
          startTime: tStart + 15,
          parentSpanID: 'child1',
        };

        // Tree structure:
        // root (0)
        //   -> child1 (10)
        //      -> grandChild1 (15)
        //   -> child2 (20)

        // Expected DFS order: root, child1, grandChild1, child2

        const traceData = trace(root, child1, child2, grandChild1);

        const result = pipeline.parse(traceData);

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

    it('exposes parent and secondary references as links on spans with multiple references', () => {
      const root = { spanID: 'root', operationName: 'root', startTime, duration };
      const parent = { spanID: 'parent', operationName: 'parent', parentSpanID: 'root', startTime, duration };
      const other = { spanID: 'other', operationName: 'other', parentSpanID: 'root', startTime, duration };
      const willGainRef = {
        spanID: 'linked',
        operationName: 'linked',
        parentSpanID: 'parent',
        references: [{ refType: 'CHILD_OF', spanID: 'other' }],
        startTime,
        duration,
      };
      const existingRefID = 'parent';
      const willBeReferencedID = 'other';

      const tTrace = pipeline.parse(trace(root, parent, other, willGainRef));
      const multiReference = tTrace.spans.filter(span => span.links.length > 0);

      expect(multiReference.length).toEqual(1);
      expect(multiReference[0].parentSpanID).toBe(existingRefID);
      expect(multiReference[0].links).toEqual([expect.objectContaining({ spanID: willBeReferencedID })]);
      const hasReferral = tTrace.spans.filter(span => span.inboundLinks.length > 0);
      expect(hasReferral.length).toEqual(1);
      expect(hasReferral[0].spanID).toBe(willBeReferencedID);
      expect(hasReferral[0].inboundLinks).toEqual([expect.objectContaining({ spanID: willGainRef.spanID })]);
    });
  });
}
