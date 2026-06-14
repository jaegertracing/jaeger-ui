// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';

import PrunedSpanRow from './PrunedSpanRow';
import { IOtelSpan } from '../../../types/otel';
import { SpanTreeOffsetState } from './utils';
import colorGenerator from '../../../utils/color-generator';

vi.mock('./SpanTreeOffset', () => {
  return {
    default: ({ ancestors, color }: { ancestors: unknown[]; color: string }) => {
      const lastAncestor =
        ancestors && ancestors.length > 0 ? (ancestors[ancestors.length - 1] as { color: string }) : null;
      return (
        <span
          data-testid="span-tree-offset"
          data-depth={ancestors ? ancestors.length : 0}
          data-color={color}
          data-ancestor-color={lastAncestor?.color ?? ''}
        />
      );
    },
  };
});

/**
 * Build a chain of `depth` parent spans and return the leaf span.
 * Connects parentSpan pointers but does NOT build childSpans arrays,
 * since buildTreeOffsetMap is not called here — we supply the map directly.
 */
function makeSpan(depth: number): IOtelSpan {
  let current: IOtelSpan | undefined;
  for (let i = 0; i < depth; i++) {
    current = {
      spanID: `span-${i}`,
      depth: i,
      hasChildren: true,
      childSpans: [],
      resource: { serviceName: 'svc-a', attributes: [] },
      parentSpan: current as unknown as IOtelSpan,
    } as unknown as IOtelSpan;
  }
  return {
    spanID: 'span-target',
    depth,
    hasChildren: true,
    childSpans: [],
    resource: { serviceName: 'svc-a', attributes: [] },
    parentSpan: current as unknown as IOtelSpan,
  } as unknown as IOtelSpan;
}

/** Build a minimal treeOffsetMap with one entry for parentSpan. */
function makeMap(
  parentSpan: IOtelSpan,
  state?: Partial<SpanTreeOffsetState>
): Map<string, SpanTreeOffsetState> {
  const map = new Map<string, SpanTreeOffsetState>();
  map.set(parentSpan.spanID, {
    ancestors: [],
    isLastChild: false,
    ...state,
  });
  return map;
}

describe('PrunedSpanRow', () => {
  it('renders singular label for 1 pruned child', () => {
    const parent = makeSpan(2);
    render(
      <PrunedSpanRow
        parentSpan={parent}
        prunedChildrenCount={1}
        prunedErrorCount={0}
        nameColumnWidth={0.5}
        timelineBarsVisible={true}
        treeOffsetMap={makeMap(parent)}
      />
    );
    expect(screen.getByText('1 span pruned')).toBeInTheDocument();
  });

  it('renders plural label for multiple pruned children', () => {
    const parent = makeSpan(1);
    render(
      <PrunedSpanRow
        parentSpan={parent}
        prunedChildrenCount={5}
        prunedErrorCount={0}
        nameColumnWidth={0.5}
        timelineBarsVisible={true}
        treeOffsetMap={makeMap(parent)}
      />
    );
    expect(screen.getByText('5 spans pruned')).toBeInTheDocument();
  });

  it('renders SpanTreeOffset at parent depth + 1 with parentSpan service color (not grandparent color)', () => {
    // parentSpan has depth=3 and 3 ancestors in the map, so the pruned
    // placeholder adds one more => data-depth=4.
    // IMPORTANT: selfAncestorEntry.color must come from parentSpan.resource.serviceName,
    // NOT from parentState.parentColor (which is the grandparent's color).
    const parent = makeSpan(3);
    const ancestorEntries = [
      { spanID: 'a0', color: '#aaa', isTerminated: false },
      { spanID: 'a1', color: '#bbb', isTerminated: false },
      { spanID: 'a2', color: '#ccc', isTerminated: false },
    ];
    const grandparentColor = '#ddd'; // parentState.parentColor — should NOT be used for stripes
    const map = makeMap(parent, { ancestors: ancestorEntries });
    render(
      <PrunedSpanRow
        parentSpan={parent}
        prunedChildrenCount={2}
        prunedErrorCount={0}
        nameColumnWidth={0.5}
        timelineBarsVisible={true}
        treeOffsetMap={map}
      />
    );
    const offset = screen.getByTestId('span-tree-offset');
    // ancestors = parentState.ancestors (3) + selfAncestorEntry (1) = 4
    expect(offset).toHaveAttribute('data-depth', '4');
    // Color must be derived from parentSpan's own serviceName, not from grandparentColor.
    // selfAncestorEntry (the last entry in ancestors) holds parentSpan's color.
    const expectedColor = colorGenerator.getColorByKey(parent.resource.serviceName);
    expect(offset).toHaveAttribute('data-ancestor-color', expectedColor);
    expect(offset).not.toHaveAttribute('data-ancestor-color', grandparentColor);
  });

  it('renders label inside endpoint-name (operation name font size)', () => {
    const parent = makeSpan(0);
    const { container } = render(
      <PrunedSpanRow
        parentSpan={parent}
        prunedChildrenCount={3}
        prunedErrorCount={0}
        nameColumnWidth={0.5}
        timelineBarsVisible={true}
        treeOffsetMap={makeMap(parent)}
      />
    );
    const small = container.querySelector('.endpoint-name');
    expect(small).toBeInTheDocument();
    expect(small).toHaveTextContent('3 spans pruned');
  });

  it('includes error count in label when errors are present', () => {
    const parent = makeSpan(0);
    render(
      <PrunedSpanRow
        parentSpan={parent}
        prunedChildrenCount={5}
        prunedErrorCount={2}
        nameColumnWidth={0.5}
        timelineBarsVisible={true}
        treeOffsetMap={makeMap(parent)}
      />
    );
    expect(screen.getByText('5 spans pruned, 2 errors')).toBeInTheDocument();
  });

  it('uses singular "error" for 1 error', () => {
    const parent = makeSpan(0);
    render(
      <PrunedSpanRow
        parentSpan={parent}
        prunedChildrenCount={3}
        prunedErrorCount={1}
        nameColumnWidth={0.5}
        timelineBarsVisible={true}
        treeOffsetMap={makeMap(parent)}
      />
    );
    expect(screen.getByText('3 spans pruned, 1 error')).toBeInTheDocument();
  });

  it('renders hollow error icon when errors are present', () => {
    const parent = makeSpan(0);
    const { container } = render(
      <PrunedSpanRow
        parentSpan={parent}
        prunedChildrenCount={5}
        prunedErrorCount={2}
        nameColumnWidth={0.5}
        timelineBarsVisible={true}
        treeOffsetMap={makeMap(parent)}
      />
    );
    const icon = container.querySelector('.SpanBarRow--errorIcon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('SpanBarRow--errorIcon--hollow');
  });

  it('does not render error icon when no errors', () => {
    const parent = makeSpan(0);
    const { container } = render(
      <PrunedSpanRow
        parentSpan={parent}
        prunedChildrenCount={5}
        prunedErrorCount={0}
        nameColumnWidth={0.5}
        timelineBarsVisible={true}
        treeOffsetMap={makeMap(parent)}
      />
    );
    expect(container.querySelector('.SpanBarRow--errorIcon')).not.toBeInTheDocument();
  });
});
