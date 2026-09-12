// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import { getDescendantParentSpanIDs, getSubtreeSpans } from './timeline-utils';
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
  });
});
