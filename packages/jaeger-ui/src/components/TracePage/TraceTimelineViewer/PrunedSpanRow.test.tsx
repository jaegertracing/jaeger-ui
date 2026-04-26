// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';

import PrunedSpanRow from './PrunedSpanRow';
import { IOtelSpan } from '../../../types/otel';

vi.mock('./SpanTreeOffset', () => {
  return {
    default: ({ ancestors, color }: { ancestors: any[]; color: string }) => (
      <span data-testid="span-tree-offset" data-depth={ancestors ? ancestors.length : 0} data-color={color} />
    ),
  };
});

function makeSpan(depth: number): IOtelSpan {
  let current: IOtelSpan | undefined;
  for (let i = 0; i < depth; i++) {
    current = {
      spanID: `span-${i}`,
      depth: i,
      hasChildren: true,
      childSpans: [],
      resource: { serviceName: 'svc-a', attributes: [] },
      parentSpan: current as any,
    } as unknown as IOtelSpan;
  }
  return {
    spanID: 'span-target',
    depth,
    hasChildren: true,
    childSpans: [],
    resource: { serviceName: 'svc-a', attributes: [] },
    parentSpan: current as any,
  } as unknown as IOtelSpan;
}

describe('PrunedSpanRow', () => {
  it('renders singular label for 1 pruned child', () => {
    render(
      <PrunedSpanRow
        parentSpan={makeSpan(2)}
        prunedChildrenCount={1}
        prunedErrorCount={0}
        nameColumnWidth={0.5}
        timelineBarsVisible={true}
      />
    );
    expect(screen.getByText('1 span pruned')).toBeInTheDocument();
  });

  it('renders plural label for multiple pruned children', () => {
    render(
      <PrunedSpanRow
        parentSpan={makeSpan(1)}
        prunedChildrenCount={5}
        prunedErrorCount={0}
        nameColumnWidth={0.5}
        timelineBarsVisible={true}
      />
    );
    expect(screen.getByText('5 spans pruned')).toBeInTheDocument();
  });

  it('renders SpanTreeOffset at parent depth + 1 with gray color', () => {
    render(
      <PrunedSpanRow
        parentSpan={makeSpan(3)}
        prunedChildrenCount={2}
        prunedErrorCount={0}
        nameColumnWidth={0.5}
        timelineBarsVisible={true}
      />
    );
    const offset = screen.getByTestId('span-tree-offset');
    expect(offset).toHaveAttribute('data-depth', '4');
    expect(offset).toHaveAttribute('data-color', '#bbb');
  });

  it('renders label inside endpoint-name (operation name font size)', () => {
    const { container } = render(
      <PrunedSpanRow
        parentSpan={makeSpan(0)}
        prunedChildrenCount={3}
        prunedErrorCount={0}
        nameColumnWidth={0.5}
        timelineBarsVisible={true}
      />
    );
    const small = container.querySelector('.endpoint-name');
    expect(small).toBeInTheDocument();
    expect(small).toHaveTextContent('3 spans pruned');
  });

  it('includes error count in label when errors are present', () => {
    render(
      <PrunedSpanRow
        parentSpan={makeSpan(0)}
        prunedChildrenCount={5}
        prunedErrorCount={2}
        nameColumnWidth={0.5}
        timelineBarsVisible={true}
      />
    );
    expect(screen.getByText('5 spans pruned, 2 errors')).toBeInTheDocument();
  });

  it('uses singular "error" for 1 error', () => {
    render(
      <PrunedSpanRow
        parentSpan={makeSpan(0)}
        prunedChildrenCount={3}
        prunedErrorCount={1}
        nameColumnWidth={0.5}
        timelineBarsVisible={true}
      />
    );
    expect(screen.getByText('3 spans pruned, 1 error')).toBeInTheDocument();
  });

  it('renders hollow error icon when errors are present', () => {
    const { container } = render(
      <PrunedSpanRow
        parentSpan={makeSpan(0)}
        prunedChildrenCount={5}
        prunedErrorCount={2}
        nameColumnWidth={0.5}
        timelineBarsVisible={true}
      />
    );
    const icon = container.querySelector('.SpanBarRow--errorIcon');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveClass('SpanBarRow--errorIcon--hollow');
  });

  it('does not render error icon when no errors', () => {
    const { container } = render(
      <PrunedSpanRow
        parentSpan={makeSpan(0)}
        prunedChildrenCount={5}
        prunedErrorCount={0}
        nameColumnWidth={0.5}
        timelineBarsVisible={true}
      />
    );
    expect(container.querySelector('.SpanBarRow--errorIcon')).not.toBeInTheDocument();
  });
});
