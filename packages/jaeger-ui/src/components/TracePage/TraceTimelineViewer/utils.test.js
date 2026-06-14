// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
  findServerChildSpan,
  createViewedBoundsFunc,
  isErrorSpan,
  spanContainsErredSpan,
  isKindClient,
  isKindProducer,
  buildTreeOffsetMap,
} from './utils';

import traceGenerator from '../../../demo/trace-generators';
import { SpanKind, StatusCode } from '../../../types/otel';

describe('TraceTimelineViewer/utils', () => {
  describe('getViewedBounds()', () => {
    it('works for the full range', () => {
      const args = { min: 1, max: 2, viewStart: 0, viewEnd: 1 };
      const { start, end } = createViewedBoundsFunc(args)(1, 2);
      expect(start).toBe(0);
      expect(end).toBe(1);
    });

    it('works for a sub-range with a full view', () => {
      const args = { min: 1, max: 2, viewStart: 0, viewEnd: 1 };
      const { start, end } = createViewedBoundsFunc(args)(1.25, 1.75);
      expect(start).toBe(0.25);
      expect(end).toBe(0.75);
    });

    it('works for a sub-range that fills the view', () => {
      const args = { min: 1, max: 2, viewStart: 0.25, viewEnd: 0.75 };
      const { start, end } = createViewedBoundsFunc(args)(1.25, 1.75);
      expect(start).toBe(0);
      expect(end).toBe(1);
    });

    it('works for a sub-range that within a sub-view', () => {
      const args = { min: 100, max: 200, viewStart: 0.1, viewEnd: 0.9 };
      const { start, end } = createViewedBoundsFunc(args)(130, 170);
      expect(start).toBe(0.25);
      expect(end).toBe(0.75);
    });
  });

  describe('isErrorSpan()', () => {
    it('returns true when span has ERROR status code', () => {
      const span = {
        status: { code: StatusCode.ERROR },
      };
      expect(isErrorSpan(span)).toBe(true);
    });

    it('returns false when span has OK status code', () => {
      const span = {
        status: { code: StatusCode.OK },
      };
      expect(isErrorSpan(span)).toBe(false);
    });

    it('returns false when span has UNSET status code', () => {
      const span = {
        status: { code: StatusCode.UNSET },
      };
      expect(isErrorSpan(span)).toBe(false);
    });
  });

  describe('spanContainsErredSpan()', () => {
    it('returns true only when a descendant has an error status', () => {
      // Using a string to generate the test spans. Each line results in a span. The
      // left number indicates whether or not the generated span has a descendant
      // with an error status (the expectation). The length of the line indicates the
      // depth of the span (i.e. further right is higher depth). The right number
      // indicates whether or not the span has an error status.
      const config = `
        1   0
        1     0
        0       1
        0     0
        1     0
        1       1
        0         1
        0           0
        1         0
        0           1
        0   0
      `
        .trim()
        .split('\n')
        .map(s => s.trim());
      // Get the expectation, str -> number -> bool
      const expectations = config.map(s => Boolean(Number(s[0])));
      const spans = config.map(line => ({
        depth: line.length,
        status: { code: +line.slice(-1) ? StatusCode.ERROR : StatusCode.OK },
      }));

      expectations.forEach((target, i) => {
        // include the index in the expect condition to know which span failed
        // (if there is a failure, that is)
        const result = [i, spanContainsErredSpan(spans, i)];
        expect(result).toEqual([i, target]);
      });
    });
  });

  describe('findServerChildSpan()', () => {
    let spans;

    beforeEach(() => {
      spans = [
        { depth: 0, kind: SpanKind.CLIENT },
        { depth: 1, kind: SpanKind.INTERNAL },
        { depth: 1, kind: SpanKind.SERVER },
        { depth: 1, kind: SpanKind.PRODUCER },
        { depth: 1, kind: SpanKind.SERVER },
      ];
    });

    it('returns falsy if the first span is not a client', () => {
      expect(findServerChildSpan(spans.slice(1))).toBeFalsy();
    });

    it('returns the first server span', () => {
      const span = findServerChildSpan(spans);
      expect(span).toBe(spans[2]);
    });

    it('bails when a non-child-depth span is encountered', () => {
      spans[1].depth++;
      expect(findServerChildSpan(spans)).toBeFalsy();
      spans[1].depth = spans[0].depth;
      expect(findServerChildSpan(spans)).toBeFalsy();
    });
  });

  describe('isKindClient()', () => {
    it('returns true when span kind is CLIENT', () => {
      const span = { kind: SpanKind.CLIENT };
      expect(isKindClient(span)).toBe(true);
    });

    it('returns false when span kind is not CLIENT', () => {
      const span = { kind: SpanKind.SERVER };
      expect(isKindClient(span)).toBe(false);
    });
  });

  describe('isKindProducer()', () => {
    it('returns true when span kind is PRODUCER', () => {
      const span = { kind: SpanKind.PRODUCER };
      expect(isKindProducer(span)).toBe(true);
    });

    it('returns false when span kind is not PRODUCER', () => {
      const span = { kind: SpanKind.CLIENT };
      expect(isKindProducer(span)).toBe(false);
    });
  });

  describe('buildTreeOffsetMap()', () => {
    // Minimal span factory — only the fields touched by buildTreeOffsetMap.
    const makeSpan = (spanID, depth, parentSpan, childSpans, serviceName = 'svc') => ({
      spanID,
      depth,
      parentSpan: parentSpan ?? null,
      childSpans: childSpans ?? [],
      resource: { serviceName },
    });

    it('returns empty map for empty span array', () => {
      const result = buildTreeOffsetMap([]);
      expect(result.size).toBe(0);
    });

    it('root span gets empty ancestors and isLastChild=false', () => {
      const root = makeSpan('root', 0, null, []);
      const map = buildTreeOffsetMap([root]);
      expect(map.get('root')).toEqual({
        ancestors: [],
        isLastChild: false,
      });
    });

    it('single child gets one ancestor entry and isLastChild=true', () => {
      const root = makeSpan('root', 0, null, [], 'root-svc');
      const child = makeSpan('child', 1, root, [], 'child-svc');
      root.childSpans = [child];
      const map = buildTreeOffsetMap([root, child]);
      const childState = map.get('child');
      expect(childState.ancestors).toHaveLength(1);
      expect(childState.ancestors[0].spanID).toBe('root');
      expect(childState.isLastChild).toBe(true);
    });

    it('siblings share the same ancestors array object (referential equality)', () => {
      const root = makeSpan('root', 0, null, [], 'root-svc');
      const c1 = makeSpan('c1', 1, root, [], 'svc');
      const c2 = makeSpan('c2', 1, root, [], 'svc');
      root.childSpans = [c1, c2];
      const map = buildTreeOffsetMap([root, c1, c2]);
      // Both children have root as their only ancestor. The array should be the
      // same object (shared, not re-allocated per sibling).
      expect(map.get('c1').ancestors).toBe(map.get('c2').ancestors);
    });

    it('first sibling has isLastChild=false, last sibling has isLastChild=true', () => {
      const root = makeSpan('root', 0, null, [], 'root-svc');
      const c1 = makeSpan('c1', 1, root, [], 'svc');
      const c2 = makeSpan('c2', 1, root, [], 'svc');
      root.childSpans = [c1, c2];
      const map = buildTreeOffsetMap([root, c1, c2]);
      expect(map.get('c1').isLastChild).toBe(false);
      expect(map.get('c2').isLastChild).toBe(true);
    });

    it('ancestor isTerminated reflects whether that ancestor was the last child of its parent', () => {
      // Tree: root -> [c1, c2];  c1 -> [gc1]
      // c1 is NOT last child of root (c2 is). So when rendering gc1,
      // the ancestor entry for root should have isTerminated=false (bar continues down).
      const root = makeSpan('root', 0, null, [], 'root-svc');
      const c1 = makeSpan('c1', 1, root, [], 'svc');
      const c2 = makeSpan('c2', 1, root, [], 'svc');
      const gc1 = makeSpan('gc1', 2, c1, [], 'svc');
      root.childSpans = [c1, c2];
      c1.childSpans = [gc1];
      const map = buildTreeOffsetMap([root, c1, gc1, c2]);
      const gc1State = map.get('gc1');
      // ancestors for gc1: [root, c1]
      expect(gc1State.ancestors).toHaveLength(2);
      // root is not terminated (c2 comes after c1 under root)
      expect(gc1State.ancestors[0].spanID).toBe('root');
      expect(gc1State.ancestors[0].isTerminated).toBe(false);
      expect(gc1State.isLastChild).toBe(true); // gc1 is last child of c1
    });

    it('ancestor isTerminated is true for a descendant under the last sibling', () => {
      // Tree: root -> [c1, c2]; c2 -> [gc2]
      // c2 IS the last child of root. When rendering gc2 the ancestor entry
      // for root must have isTerminated=true (bar stops — no more siblings).
      const root = makeSpan('root', 0, null, [], 'root-svc');
      const c1 = makeSpan('c1', 1, root, [], 'svc');
      const c2 = makeSpan('c2', 1, root, [], 'svc');
      const gc2 = makeSpan('gc2', 2, c2, [], 'svc');
      root.childSpans = [c1, c2];
      c2.childSpans = [gc2];
      const map = buildTreeOffsetMap([root, c1, c2, gc2]);
      const gc2State = map.get('gc2');
      // ancestors for gc2: [root, c2]
      expect(gc2State.ancestors).toHaveLength(2);
      // root.isTerminated must be true — c2 is root's last child
      expect(gc2State.ancestors[0].spanID).toBe('root');
      expect(gc2State.ancestors[0].isTerminated).toBe(true);
      // c2.isTerminated must be true — gc2 is c2's last child
      expect(gc2State.ancestors[1].spanID).toBe('c2');
      expect(gc2State.ancestors[1].isTerminated).toBe(true);
      expect(gc2State.isLastChild).toBe(true);
    });

    it('grandchild depth produces correct ancestor chain length', () => {
      const root = makeSpan('root', 0, null, [], 'svc');
      const child = makeSpan('child', 1, root, [], 'svc');
      const grandchild = makeSpan('gc', 2, child, [], 'svc');
      root.childSpans = [child];
      child.childSpans = [grandchild];
      const map = buildTreeOffsetMap([root, child, grandchild]);
      expect(map.get('gc').ancestors).toHaveLength(2);
    });
  });
});
