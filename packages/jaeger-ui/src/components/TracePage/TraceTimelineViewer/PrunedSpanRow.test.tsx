// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it } from 'vitest';

import PrunedSpanRow from './PrunedSpanRow';
import { IOtelSpan } from '../../../types/otel';

function makeSpan(depth: number): IOtelSpan {
  return {
    depth,
    spanID: 'span-1',
    resource: { serviceName: 'svc-a', attributes: [] },
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

  it('applies indentation based on parent depth + 1', () => {
    const { container } = render(
      <PrunedSpanRow
        parentSpan={makeSpan(3)}
        prunedChildrenCount={2}
        prunedErrorCount={0}
        nameColumnWidth={0.5}
        timelineBarsVisible={true}
      />
    );
    const wrapper = container.querySelector('.PrunedSpanRow--wrapper') as HTMLElement;
    // depth 3 + 1 = 4, 4 * 20 + 16 = 96
    expect(wrapper.style.paddingLeft).toBe('96px');
  });

  it('renders the gray dot', () => {
    const { container } = render(
      <PrunedSpanRow
        parentSpan={makeSpan(0)}
        prunedChildrenCount={3}
        prunedErrorCount={0}
        nameColumnWidth={0.5}
        timelineBarsVisible={true}
      />
    );
    expect(container.querySelector('.PrunedSpanRow--dot')).toBeInTheDocument();
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

  it('renders error icon when errors are present', () => {
    const { container } = render(
      <PrunedSpanRow
        parentSpan={makeSpan(0)}
        prunedChildrenCount={5}
        prunedErrorCount={2}
        nameColumnWidth={0.5}
        timelineBarsVisible={true}
      />
    );
    expect(container.querySelector('.PrunedSpanRow--errorIcon')).toBeInTheDocument();
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
    expect(container.querySelector('.PrunedSpanRow--errorIcon')).not.toBeInTheDocument();
  });
});
