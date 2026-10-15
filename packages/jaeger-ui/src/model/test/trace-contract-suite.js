// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import getConfig from '../../utils/config/get-config';
import { SpanKind } from '../../types/otel';

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

  describe(pipeline.name, () => {
    const startTime = 1586160015434000;
    const duration = 34000;
    // This trace ID differs from the one in transform-trace-data.test.ts because getTraceName() memoizes by trace ID.
    const traceID = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
    const rootSpanID = 'd4dcb46e95b781f5';
    const rootOperationName = 'rootOperation';
    const serviceName = 'serviceName';

    // Each pipeline renders the span specs into the wire format it parses.
    const trace = (...spans) => pipeline.materialize({ traceID, serviceName, spans });
    const id = pipeline.spanID;

    it('uses UNSPECIFIED for a missing span kind', () => {
      const result = pipeline.parse(trace({ spanID: rootSpanID, operationName: rootOperationName }));
      expect(result.spans[0].kind).toBe(SpanKind.UNSPECIFIED);
    });

    it.each([
      [0, SpanKind.UNSPECIFIED],
      [1, SpanKind.INTERNAL],
      [2, SpanKind.SERVER],
      [3, SpanKind.CLIENT],
      [4, SpanKind.PRODUCER],
      [5, SpanKind.CONSUMER],
      [99, SpanKind.UNSPECIFIED],
    ])('maps span kind %s to %s', (kind, expected) => {
      const result = pipeline.parse(trace({ spanID: rootSpanID, operationName: rootOperationName, kind }));
      expect(result.spans[0].kind).toBe(expected);
    });

    it.each([undefined, {}, { name: '' }])('uses unknown for a missing scope name in %s', scope => {
      const result = pipeline.parse(trace({ spanID: rootSpanID, operationName: rootOperationName, scope }));
      expect(result.spans[0].instrumentationScope.name).toBe('unknown');
    });

    it.each([undefined, ''])('uses log for a missing event name %s', name => {
      const result = pipeline.parse(
        trace({
          spanID: rootSpanID,
          operationName: rootOperationName,
          events: [{ name, timestamp: startTime }],
        })
      );
      expect(result.spans[0].events[0].name).toBe('log');
    });

    it('preserves explicit scope and event names', () => {
      const result = pipeline.parse(
        trace({
          spanID: rootSpanID,
          operationName: rootOperationName,
          scope: { name: 'instrumentation', version: '1.2.3' },
          events: [{ name: 'message', timestamp: startTime, attributes: [{ key: 'answer', value: 0 }] }],
        })
      );
      expect(result.spans[0].instrumentationScope).toMatchObject({
        name: 'instrumentation',
        version: '1.2.3',
      });
      expect(result.spans[0].events[0]).toMatchObject({ name: 'message', timestamp: startTime });
      expect(result.spans[0].events[0].attributes.getValue('answer')).toBe(0);
    });

    it('uses an empty warnings array for a span without warnings', () => {
      const result = pipeline.parse(trace({ spanID: rootSpanID, operationName: rootOperationName }));
      expect(result.spans[0].warnings).toEqual([]);
    });

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
        startTime: undefined,
        duration: 10,
      };

      const result = pipeline.parse(trace(zeroRoot, zeroChild, noStartTimeChild));

      // No span is dropped: startTime 0 (epoch) and a missing startTime are both
      // treated as "no usable timestamp" and repaired rather than filtered out.
      expect(result.spans.map(span => span.spanID)).toEqual([
        id(rootSpanID),
        id('zeroChild'),
        id('missingStartTime'),
      ]);
      expect(result.startTime).toBe(0);
      expect(result.spans.every(span => span.startTime === 0)).toBe(true);
      expect(result.spanMap.get(id(rootSpanID)).hasChildren).toBe(true);
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
        startTime: undefined,
        duration: 300,
      };

      const result = pipeline.parse(trace(realRoot, zeroChild, missingChild));

      expect(result.startTime).toBe(realStart);
      // The broken children inherit the parent's startTime, so they sit at the
      // start of the trace rather than 56 years before it.
      expect(result.spanMap.get(id('zeroChild')).startTime).toBe(realStart);
      expect(result.spanMap.get(id('missingChild')).startTime).toBe(realStart);
      expect(result.spanMap.get(id('zeroChild')).relativeStartTime).toBe(0);
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
        startTime: undefined,
        duration: 100,
      };

      const result = pipeline.parse(trace(realRoot, brokenMiddle, brokenLeaf));

      expect(result.startTime).toBe(realStart);
      expect(result.spanMap.get(id('brokenMiddle')).startTime).toBe(realStart);
      // The leaf inherits the middle span's repaired startTime, not undefined.
      expect(result.spanMap.get(id('brokenLeaf')).startTime).toBe(realStart);
      expect(result.spanMap.get(id('brokenLeaf')).relativeStartTime).toBe(0);
      expect(result.duration).toBe(1000);
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
        startTime: undefined,
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
      expect(result.spanMap.get(id('real')).startTime).toBe(realStart + 500);
      expect(result.spans[result.spans.length - 1].spanID).toBe(id('real'));
    });

    it('should fall back to 0 for a root with no usable startTime and propagate it to children', () => {
      const brokenRoot = {
        spanID: rootSpanID,
        operationName: rootOperationName,
        startTime: undefined,
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
      expect(result.spanMap.get(id(rootSpanID)).startTime).toBe(0);
      expect(result.spanMap.get(id('child')).startTime).toBe(0);
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

    it('should detect an orphan with an explicit missing parent', () => {
      const followsFromOrphan = {
        spanID: 'followsOrphan',
        operationName: 'followsOrphanOp',
        parentSpanID: 'nonexistent',
        startTime: startTime,
        duration,
      };

      const traceData = trace(rootSpanWithoutRefs, followsFromOrphan);

      const result = pipeline.parse(traceData);
      expect(result.orphanSpanCount).toBe(1);
    });

    describe('spanMap, rootSpans, and childSpans collections', () => {
      it('should build spanMap with all spans', () => {
        const traceData = trace(...spans, rootSpanWithoutRefs);

        const result = pipeline.parse(traceData);

        // spanMap should contain all spans
        expect(result.spanMap).toBeInstanceOf(Map);
        expect(result.spanMap.size).toBe(3);
        expect(result.spanMap.get(id(rootSpanID))).toBeDefined();
        expect(result.spanMap.get(id(spans[0].spanID))).toBeDefined();
        expect(result.spanMap.get(id(spans[1].spanID))).toBeDefined();
      });

      it('should identify root spans correctly', () => {
        const traceData = trace(...spans, rootSpanWithoutRefs);

        const result = pipeline.parse(traceData);

        // Should have one root span (rootSpanWithoutRefs)
        expect(result.rootSpans).toBeInstanceOf(Array);
        expect(result.rootSpans.length).toBe(1);
        expect(result.rootSpans[0].spanID).toBe(id(rootSpanID));
        expect(result.rootSpans[0].name).toBe(rootOperationName);
      });

      it('should build childSpans arrays correctly', () => {
        const traceData = trace(...spans, rootSpanWithoutRefs);

        const result = pipeline.parse(traceData);

        // Root span should have two children
        const rootSpan = result.spanMap.get(id(rootSpanID));
        expect(rootSpan.childSpans).toBeInstanceOf(Array);
        expect(rootSpan.childSpans.length).toBe(2);

        // Children should be sorted by start time
        expect(rootSpan.childSpans[0].spanID).toBe(id(spans[0].spanID));
        expect(rootSpan.childSpans[1].spanID).toBe(id(spans[1].spanID));

        // Child spans should have no children
        const childSpan1 = result.spanMap.get(id(spans[0].spanID));
        const childSpan2 = result.spanMap.get(id(spans[1].spanID));
        expect(childSpan1.childSpans).toEqual([]);
        expect(childSpan2.childSpans).toEqual([]);
      });

      it('should handle orphan spans as root spans', () => {
        const traceData = trace(...spans, rootSpanWithMissingRef);

        const result = pipeline.parse(traceData);

        // rootSpanWithMissingRef references a missing parent, so it should be a root span
        expect(result.rootSpans.length).toBe(1);
        expect(result.rootSpans[0].spanID).toBe(id(rootSpanID));

        // The root span should still have its two children
        const rootSpan = result.spanMap.get(id(rootSpanID));
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
        expect(result.rootSpans[0].spanID).toBe(id(rootSpanID));
        expect(result.rootSpans[1].spanID).toBe(id(secondRoot.spanID));
      });

      it('should maintain span references in childSpans array', () => {
        const traceData = trace(...spans, rootSpanWithoutRefs);

        const result = pipeline.parse(traceData);

        const rootSpan = result.spanMap.get(id(rootSpanID));

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
        expect(map.get(id('root')).depth).toBe(0);
        expect(map.get(id('child1')).depth).toBe(1);
        expect(map.get(id('grandChild1')).depth).toBe(2);
        expect(map.get(id('child2')).depth).toBe(1);

        // Check hasChildren
        expect(map.get(id('root')).hasChildren).toBe(true);
        expect(map.get(id('child1')).hasChildren).toBe(true);
        expect(map.get(id('grandChild1')).hasChildren).toBe(false);
        expect(map.get(id('child2')).hasChildren).toBe(false);

        // Check flat spans order (DFS)
        const ids = result.spans.map(s => s.spanID);
        expect(ids).toEqual([id('root'), id('child1'), id('grandChild1'), id('child2')]);
      });

      it('should handle deeply nested traces without overflowing the call stack', () => {
        // A long parent -> child chain previously overflowed the stack because the
        // traversal was recursive. This depth exceeds typical call-stack limits in
        // our test runtime (V8), so the old recursive code reliably threw here.
        const depth = 15000;
        // Unique trace ID: getTraceName() memoizes by trace ID.
        const deepTraceID = 'dee9e570000000000000000000004111';
        const deepSpans = [];
        for (let i = 0; i < depth; i++) {
          deepSpans.push({
            spanID: `span-${i}`,
            operationName: `op-${i}`,
            ...(i > 0 ? { parentSpanID: `span-${i - 1}` } : {}),
            startTime: startTime + i,
            duration,
          });
        }

        const traceData = pipeline.materialize({
          traceID: deepTraceID,
          serviceName,
          spans: deepSpans,
        });

        let result;
        expect(() => {
          result = pipeline.parse(traceData);
        }).not.toThrow();

        expect(result.spans.length).toBe(depth);
        // Pre-order traversal keeps the chain in order, with depth matching position.
        expect(result.spans[0].spanID).toBe(id('span-0'));
        expect(result.spans[0].depth).toBe(0);
        expect(result.spans[depth - 1].spanID).toBe(id(`span-${depth - 1}`));
        expect(result.spans[depth - 1].depth).toBe(depth - 1);
      });
    });

    it('exposes parent and secondary references as links on spans with multiple references', () => {
      const root = { spanID: 'root', operationName: 'root' };
      const parent = { spanID: 'parent', operationName: 'parent', parentSpanID: 'root' };
      const other = { spanID: 'other', operationName: 'other', parentSpanID: 'root' };
      const willGainRef = {
        spanID: 'linked',
        operationName: 'linked',
        parentSpanID: 'parent',
        references: [{ refType: 'CHILD_OF', spanID: 'other' }],
      };
      const existingRefID = id('parent');
      const willBeReferencedID = id('other');

      const tTrace = pipeline.parse(trace(root, parent, other, willGainRef));
      const multiReference = tTrace.spans.filter(span => span.links.length > 0);

      expect(multiReference.length).toEqual(1);
      expect(multiReference[0].parentSpanID).toBe(existingRefID);
      expect(multiReference[0].links).toEqual([expect.objectContaining({ spanID: willBeReferencedID })]);
      const hasReferral = tTrace.spans.filter(span => span.inboundLinks.length > 0);
      expect(hasReferral.length).toEqual(1);
      expect(hasReferral[0].spanID).toBe(willBeReferencedID);
      expect(hasReferral[0].inboundLinks).toEqual([
        expect.objectContaining({ spanID: id(willGainRef.spanID) }),
      ]);
    });
  });
}
