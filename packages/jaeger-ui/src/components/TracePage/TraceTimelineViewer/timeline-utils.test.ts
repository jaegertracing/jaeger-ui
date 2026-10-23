// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { focusedSpanIDs, getDescendantParentSpanIDs, getSubtreeSpans } from './timeline-utils';
import { IOtelSpan } from '../../../types/otel';

describe('timeline-utils subtree helpers', () => {
  const leaf1: IOtelSpan = {
    spanID: 'leaf-1',
    hasChildren: false,
    childSpans: [],
  } as unknown as IOtelSpan;

  const leaf2: IOtelSpan = {
    spanID: 'leaf-2',
    hasChildren: false,
    childSpans: [],
  } as unknown as IOtelSpan;

  const middleParent: IOtelSpan = {
    spanID: 'middle-1',
    hasChildren: true,
    childSpans: [leaf2],
  } as unknown as IOtelSpan;

  const rootSpan: IOtelSpan = {
    spanID: 'root-1',
    hasChildren: true,
    childSpans: [leaf1, middleParent],
  } as unknown as IOtelSpan;

  const standaloneLeaf: IOtelSpan = {
    spanID: 'standalone-1',
    hasChildren: false,
  } as unknown as IOtelSpan;

  describe('getSubtreeSpans', () => {
    it('returns all descendant spans in pre-order DFS including rootSpan', () => {
      const result = getSubtreeSpans(rootSpan);
      expect(result).toEqual([rootSpan, leaf1, middleParent, leaf2]);
    });

    it('handles a leaf span with no childSpans property safely', () => {
      const result = getSubtreeSpans(standaloneLeaf);
      expect(result).toEqual([standaloneLeaf]);
    });

    it('does not overflow call stack on deeply nested traces', () => {
      let current: IOtelSpan = {
        spanID: 'deep-0',
        hasChildren: true,
        childSpans: [],
      } as unknown as IOtelSpan;
      const root = current;
      for (let i = 1; i <= 5000; i++) {
        const next: IOtelSpan = {
          spanID: `deep-${i}`,
          hasChildren: i < 5000,
          childSpans: [],
        } as unknown as IOtelSpan;
        current.childSpans = [next];
        current = next;
      }
      const result = getSubtreeSpans(root);
      expect(result.length).toBe(5001);
      expect(result[0].spanID).toBe('deep-0');
      expect(result[5000].spanID).toBe('deep-5000');
    });
  });

  describe('getDescendantParentSpanIDs', () => {
    it('returns a Set containing IDs of all spans in the subtree that have hasChildren=true', () => {
      const result = getDescendantParentSpanIDs(rootSpan);
      expect(result.size).toBe(2);
      expect(result.has('root-1')).toBe(true);
      expect(result.has('middle-1')).toBe(true);
      expect(result.has('leaf-1')).toBe(false);
      expect(result.has('leaf-2')).toBe(false);
    });

    it('handles a leaf span with no childSpans property safely', () => {
      const result = getDescendantParentSpanIDs(standaloneLeaf);
      expect(result.size).toBe(0);
    });

    it('does not overflow call stack on deeply nested traces', () => {
      let current: IOtelSpan = {
        spanID: 'deep-0',
        hasChildren: true,
        childSpans: [],
      } as unknown as IOtelSpan;
      const root = current;
      for (let i = 1; i <= 5000; i++) {
        const next: IOtelSpan = {
          spanID: `deep-${i}`,
          hasChildren: i < 5000,
          childSpans: [],
        } as unknown as IOtelSpan;
        current.childSpans = [next];
        current = next;
      }
      const result = getDescendantParentSpanIDs(root);
      expect(result.size).toBe(5000);
      expect(result.has('deep-0')).toBe(true);
      expect(result.has('deep-4999')).toBe(true);
      expect(result.has('deep-5000')).toBe(false);
    });
  });

  describe('focusedSpanIDs', () => {
    const spanTreeTrace = {
      traceID: 't1',
      spans: [rootSpan, leaf1, middleParent, leaf2],
      spanMap: new Map([
        ['root-1', rootSpan],
        ['leaf-1', leaf1],
        ['middle-1', middleParent],
        ['leaf-2', leaf2],
      ]),
    } as any;

    it('returns null when no focusedSubtreeSpanID or trace is null', () => {
      expect(focusedSpanIDs(null, 'root-1')).toBeNull();
      expect(focusedSpanIDs(spanTreeTrace, null)).toBeNull();
      expect(focusedSpanIDs(spanTreeTrace, undefined)).toBeNull();
    });

    it('returns null when focused span is not in trace', () => {
      expect(focusedSpanIDs(spanTreeTrace, 'non-existent')).toBeNull();
    });

    it('returns Set of subtree span IDs for a valid focused span', () => {
      const result = focusedSpanIDs(spanTreeTrace, 'middle-1');
      expect(result).toEqual(new Set(['middle-1', 'leaf-2']));
    });

    it('memoizes output when arguments match', () => {
      const res1 = focusedSpanIDs(spanTreeTrace, 'middle-1', new Set(['svc-other']));
      const res2 = focusedSpanIDs(spanTreeTrace, 'middle-1', new Set(['svc-other']));
      expect(res1).toBe(res2);
    });
  });
});
