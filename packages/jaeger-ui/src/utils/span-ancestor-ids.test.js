// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import spanAncestorIds from './span-ancestor-ids';

describe('spanAncestorIds', () => {
  const rootSpanId = 'root-span-id';
  const grandparentSpanId = 'grandparent-span-id';
  const parentSpanId = 'parent-span-id';
  const childSpanId = 'child-span-id';

  const rootSpan = {
    spanID: rootSpanId,
    parentSpanId: undefined,
    parentSpan: undefined,
  };

  const grandparentSpan = {
    spanID: grandparentSpanId,
    parentSpanId: rootSpanId,
    parentSpan: rootSpan,
  };

  const parentSpan = {
    spanID: parentSpanId,
    parentSpanId: grandparentSpanId,
    parentSpan: grandparentSpan,
  };

  const childSpan = {
    spanID: childSpanId,
    parentSpanId: parentSpanId,
    parentSpan: parentSpan,
  };

  it('returns an empty array if given falsy span', () => {
    expect(spanAncestorIds(null)).toEqual([]);
  });

  it('returns an empty array if span has no parentSpan', () => {
    expect(spanAncestorIds(rootSpan)).toEqual([]);
  });

  it('returns all ancestor span IDs from parent to root', () => {
    expect(spanAncestorIds(childSpan)).toEqual([parentSpanId, grandparentSpanId, rootSpanId]);
  });

  it('stops traversal when parent span is not available', () => {
    const isolatedChild = {
      spanID: childSpanId,
      parentSpanId: parentSpanId,
      parentSpan: undefined, // No parent span available
    };

    expect(spanAncestorIds(isolatedChild)).toEqual([]);
  });

  it('handles single-level parent relationship', () => {
    expect(spanAncestorIds(grandparentSpan)).toEqual([rootSpanId]);
  });
});
