// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { shouldDisableCollapse } from './timeline-utils';
import { IOtelSpan, StatusCode } from '../../../types/otel';
import { makeAttributes } from '../../../model/attributes';

function makeSpan(spanID: string, hasChildren: boolean): IOtelSpan {
  return {
    spanID,
    hasChildren,
    childSpans: [],
    parentSpan: undefined,
    depth: 0,
    resource: { serviceName: 'svc', attributes: makeAttributes() },
    status: { code: StatusCode.UNSET },
  } as unknown as IOtelSpan;
}

describe('shouldDisableCollapse', () => {
  it('returns true when all parent spans are hidden', () => {
    const spans = [makeSpan('parent-1', true), makeSpan('parent-2', true), makeSpan('leaf-1', false)];
    const hidden = new Set(['parent-1', 'parent-2']);
    expect(shouldDisableCollapse(spans, hidden)).toBe(true);
  });

  it('returns false when at least one parent span is NOT hidden', () => {
    const spans = [makeSpan('parent-1', true), makeSpan('parent-2', true), makeSpan('leaf-1', false)];
    const hidden = new Set(['parent-1']); // parent-2 is still visible
    expect(shouldDisableCollapse(spans, hidden)).toBe(false);
  });

  it('returns false when there are no hidden spans at all', () => {
    const spans = [makeSpan('parent-1', true), makeSpan('leaf-1', false)];
    expect(shouldDisableCollapse(spans, new Set())).toBe(false);
  });

  it('returns true when there are no parent spans (nothing to collapse)', () => {
    const spans = [makeSpan('leaf-1', false), makeSpan('leaf-2', false)];
    expect(shouldDisableCollapse(spans, new Set())).toBe(true);
  });

  it('returns true for an empty span list', () => {
    expect(shouldDisableCollapse([], new Set())).toBe(true);
  });

  it('is NOT fooled by hidden leaf-span IDs that inflate hiddenSpansIds.size', () => {
    // Regression guard: old duck.ts used allParentSpans.length === hiddenSpansIds.size
    // which gives wrong answer if hidden set contains leaf span IDs.
    // Scenario: 1 visible parent, 1 hidden leaf → sizes are equal but collapse should NOT be disabled.
    const spans = [makeSpan('parent-1', true), makeSpan('leaf-1', false)];
    const hidden = new Set(['leaf-1']); // leaf hidden but parent-1 is visible
    // Old code: allParentSpans.length (1) === hiddenSpansIds.size (1) → true (WRONG)
    // New code: parent-1 not in hiddenSpansIds → false (CORRECT)
    expect(shouldDisableCollapse(spans, hidden)).toBe(false);
  });
});
