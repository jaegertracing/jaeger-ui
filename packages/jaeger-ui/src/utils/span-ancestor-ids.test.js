// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import spanAncestorIdsSpy, { otelSpanAncestorIds } from './span-ancestor-ids';

describe('spanAncestorIdsSpy', () => {
  const ownSpanID = 'ownSpanID';
  const firstParentSpanID = 'firstParentSpanID';
  const firstParentFirstGrandparentSpanID = 'firstParentFirstGrandparentSpanID';
  const firstParentSecondGrandparentSpanID = 'firstParentSecondGrandparentSpanID';
  const secondParentSpanID = 'secondParentSpanID';
  const rootSpanID = 'rootSpanID';
  const span = {
    references: [
      {
        span: {
          spanID: firstParentSpanID,
          references: [
            {
              span: {
                spanID: firstParentFirstGrandparentSpanID,
                references: [
                  {
                    span: {
                      spanID: rootSpanID,
                    },
                  },
                ],
              },
              refType: 'not an ancestor ref type',
            },
            {
              span: {
                spanID: firstParentSecondGrandparentSpanID,
                references: [
                  {
                    span: {
                      spanID: rootSpanID,
                    },
                    refType: 'FOLLOWS_FROM',
                  },
                ],
              },
              refType: 'CHILD_OF',
            },
          ],
        },
        refType: 'CHILD_OF',
      },
      {
        span: {
          spanID: secondParentSpanID,
        },
        refType: 'CHILD_OF',
      },
    ],
    spanID: ownSpanID,
  };
  const expectedAncestorIds = [firstParentSpanID, firstParentSecondGrandparentSpanID, rootSpanID];

  it('returns an empty array if given falsy span', () => {
    expect(spanAncestorIdsSpy(null)).toEqual([]);
  });

  it('returns an empty array if span has no references', () => {
    const spanWithoutReferences = {
      spanID: 'parentlessSpanID',
      references: [],
    };

    expect(spanAncestorIdsSpy(spanWithoutReferences)).toEqual([]);
  });

  it('returns all unique spanIDs from first valid CHILD_OF or FOLLOWS_FROM reference up to the root span', () => {
    expect(spanAncestorIdsSpy(span)).toEqual(expectedAncestorIds);
  });

  it('ignores references without a span', () => {
    const spanWithSomeEmptyReferences = {
      ...span,
      references: [{ refType: 'CHILD_OF' }, { refType: 'FOLLOWS_FROM', span: {} }, ...span.references],
    };
    expect(spanAncestorIdsSpy(spanWithSomeEmptyReferences)).toEqual(expectedAncestorIds);
  });
});

describe('otelSpanAncestorIds', () => {
  const rootSpanId = 'root-span-id';
  const grandparentSpanId = 'grandparent-span-id';
  const parentSpanId = 'parent-span-id';
  const childSpanId = 'child-span-id';

  const rootSpan = {
    spanId: rootSpanId,
    parentSpanId: undefined,
    parentSpan: undefined,
  };

  const grandparentSpan = {
    spanId: grandparentSpanId,
    parentSpanId: rootSpanId,
    parentSpan: rootSpan,
  };

  const parentSpan = {
    spanId: parentSpanId,
    parentSpanId: grandparentSpanId,
    parentSpan: grandparentSpan,
  };

  const childSpan = {
    spanId: childSpanId,
    parentSpanId: parentSpanId,
    parentSpan: parentSpan,
  };

  it('returns an empty array if given falsy span', () => {
    expect(otelSpanAncestorIds(null)).toEqual([]);
  });

  it('returns an empty array if span has no parentSpan', () => {
    expect(otelSpanAncestorIds(rootSpan)).toEqual([]);
  });

  it('returns all ancestor span IDs from parent to root', () => {
    expect(otelSpanAncestorIds(childSpan)).toEqual([parentSpanId, grandparentSpanId, rootSpanId]);
  });

  it('stops traversal when parent span is not available', () => {
    const isolatedChild = {
      spanId: childSpanId,
      parentSpanId: parentSpanId,
      parentSpan: undefined, // No parent span available
    };

    expect(otelSpanAncestorIds(isolatedChild)).toEqual([]);
  });

  it('handles single-level parent relationship', () => {
    expect(otelSpanAncestorIds(grandparentSpan)).toEqual([rootSpanId]);
  });
});
