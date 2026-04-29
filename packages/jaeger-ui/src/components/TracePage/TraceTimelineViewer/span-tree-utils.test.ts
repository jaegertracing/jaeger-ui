import { describe, expect, it, vi } from 'vitest';
import { computeAncestorEntries, computeIsLastChild } from './span-tree-utils';
import { IOtelSpan } from '../../../types/otel';

vi.mock('../../../utils/color-generator', () => ({
  default: {
    getColorByKey: vi.fn((svc: string) => `#color-${svc}`),
  },
}));

function makeChain(): { root: IOtelSpan; parent: IOtelSpan; child: IOtelSpan; sibling: IOtelSpan } {
  const root = {
    spanID: 'root',
    hasChildren: true,
    childSpans: [],
    parentSpan: null,
    resource: { serviceName: 'root-svc' },
  } as unknown as IOtelSpan;

  const parent = {
    spanID: 'parent',
    hasChildren: true,
    childSpans: [],
    parentSpan: root,
    resource: { serviceName: 'parent-svc' },
  } as unknown as IOtelSpan;

  const child = {
    spanID: 'child',
    hasChildren: false,
    childSpans: [],
    parentSpan: parent,
    resource: { serviceName: 'child-svc' },
  } as unknown as IOtelSpan;

  const sibling = {
    spanID: 'sibling',
    hasChildren: false,
    childSpans: [],
    parentSpan: parent,
    resource: { serviceName: 'sibling-svc' },
  } as unknown as IOtelSpan;

  root.childSpans = [parent];
  parent.childSpans = [child, sibling];

  return { root, parent, child, sibling };
}

describe('span-tree-utils', () => {
  describe('computeIsLastChild', () => {
    it('returns false for root spans (no parent)', () => {
      const { root } = makeChain();
      expect(computeIsLastChild(root)).toBe(false);
    });

    it('returns false when span is not the last child', () => {
      const { child } = makeChain();
      expect(computeIsLastChild(child)).toBe(false);
    });

    it('returns true when span is the last child', () => {
      const { sibling } = makeChain();
      expect(computeIsLastChild(sibling)).toBe(true);
    });

    it('returns true for an only child', () => {
      const { parent } = makeChain();
      // parent is the only child of root
      expect(computeIsLastChild(parent)).toBe(true);
    });
  });

  describe('computeAncestorEntries', () => {
    it('returns empty array for root spans', () => {
      const { root } = makeChain();
      expect(computeAncestorEntries(root)).toEqual([]);
    });

    it('returns one entry for a span with one ancestor', () => {
      const { parent } = makeChain();
      const entries = computeAncestorEntries(parent);
      expect(entries).toHaveLength(1);
      expect(entries[0].ancestorId).toBe('root');
      // parent is the only (last) child of root, but since it is the immediate parent
      // (isLastAncestor), its color is always preserved (never null)
      expect(entries[0].color).toBe('#color-root-svc');
    });

    it('returns entries ordered outermost to immediate parent', () => {
      const { child } = makeChain();
      const entries = computeAncestorEntries(child);
      expect(entries).toHaveLength(2);
      expect(entries[0].ancestorId).toBe('root');
      expect(entries[1].ancestorId).toBe('parent');
    });

    it('sets color to null for non-immediate ancestors whose branch has terminated', () => {
      // parent is the last child of root, so root's branch terminates
      const { child } = makeChain();
      const entries = computeAncestorEntries(child);
      // root's descendant in chain (parent) is the last child of root → terminated
      expect(entries[0].color).toBeNull();
      // parent is the immediate ancestor → always has color
      expect(entries[1].color).toBe('#color-parent-svc');
    });

    it('preserves color for non-immediate ancestors whose branch has NOT terminated', () => {
      const { sibling } = makeChain();
      const entries = computeAncestorEntries(sibling);
      // root's descendant in chain (parent) is the last child of root → terminated
      expect(entries[0].color).toBeNull();
      // parent is the immediate ancestor → always has color
      expect(entries[1].color).toBe('#color-parent-svc');
    });

    it('preserves color when descendant in chain is NOT the last child', () => {
      // Create a deeper chain where the descendant is NOT the last child
      const root = {
        spanID: 'root',
        hasChildren: true,
        childSpans: [],
        parentSpan: null,
        resource: { serviceName: 'root-svc' },
      } as unknown as IOtelSpan;

      const mid1 = {
        spanID: 'mid1',
        hasChildren: true,
        childSpans: [],
        parentSpan: root,
        resource: { serviceName: 'mid1-svc' },
      } as unknown as IOtelSpan;

      const mid2 = {
        spanID: 'mid2',
        hasChildren: false,
        childSpans: [],
        parentSpan: root,
        resource: { serviceName: 'mid2-svc' },
      } as unknown as IOtelSpan;

      const leaf = {
        spanID: 'leaf',
        hasChildren: false,
        childSpans: [],
        parentSpan: mid1,
        resource: { serviceName: 'leaf-svc' },
      } as unknown as IOtelSpan;

      root.childSpans = [mid1, mid2]; // mid1 is NOT the last child
      mid1.childSpans = [leaf];

      const entries = computeAncestorEntries(leaf);
      expect(entries).toHaveLength(2);
      // root's descendant (mid1) is NOT the last child → root color preserved
      expect(entries[0].color).toBe('#color-root-svc');
      // mid1 is immediate parent → always has color
      expect(entries[1].color).toBe('#color-mid1-svc');
    });
  });
});
