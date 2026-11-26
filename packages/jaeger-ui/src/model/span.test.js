// Copyright (c) 2017 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { getParentSpanID, getNonParentReferences } from './span';

describe('getParentSpanID', () => {
  it('returns undefined if references is missing or empty', () => {
    expect(getParentSpanID({ traceID: 't1', spanID: 's1' })).toBeUndefined();
    expect(getParentSpanID({ traceID: 't1', spanID: 's1', references: [] })).toBeUndefined();
  });

  it('returns the spanID of the first same-trace CHILD_OF reference', () => {
    const span = {
      traceID: 't1',
      spanID: 's1',
      references: [
        { refType: 'CHILD_OF', traceID: 't1', spanID: 'p1' },
        { refType: 'CHILD_OF', traceID: 't1', spanID: 'p2' },
      ],
    };
    expect(getParentSpanID(span)).toBe('p1');
  });

  it('returns the spanID of the first same-trace FOLLOWS_FROM reference if no CHILD_OF exists', () => {
    const span = {
      traceID: 't1',
      spanID: 's1',
      references: [{ refType: 'FOLLOWS_FROM', traceID: 't1', spanID: 'p1' }],
    };
    expect(getParentSpanID(span)).toBe('p1');
  });

  it('prefers same-trace CHILD_OF over FOLLOWS_FROM', () => {
    const span = {
      traceID: 't1',
      spanID: 's1',
      references: [
        { refType: 'FOLLOWS_FROM', traceID: 't1', spanID: 'follows' },
        { refType: 'CHILD_OF', traceID: 't1', spanID: 'child' },
      ],
    };
    expect(getParentSpanID(span)).toBe('child');
  });

  it('ignores references from a different traceID', () => {
    const span = {
      traceID: 't1',
      spanID: 's1',
      references: [
        { refType: 'CHILD_OF', traceID: 'other-trace', spanID: 'p-other' },
        { refType: 'FOLLOWS_FROM', traceID: 'other-trace', spanID: 'p-other-2' },
      ],
    };
    expect(getParentSpanID(span)).toBeUndefined();
  });
});

describe('getNonParentReferences', () => {
  it('returns an empty array if references is missing or empty', () => {
    expect(getNonParentReferences({ traceID: 't1', spanID: 's1' })).toEqual([]);
    expect(getNonParentReferences({ traceID: 't1', spanID: 's1', references: [] })).toEqual([]);
  });

  it('returns all references when none match the parent criteria', () => {
    const ref = { refType: 'CHILD_OF', traceID: 'other-trace', spanID: 'p-other' };
    const span = { traceID: 't1', spanID: 's1', references: [ref] };
    expect(getNonParentReferences(span)).toEqual([ref]);
  });

  it('filters out the identified parent reference and keeps non-parent references', () => {
    const parentRef = { refType: 'CHILD_OF', traceID: 't1', spanID: 'parent' };
    const otherRef = { refType: 'CHILD_OF', traceID: 'other-trace', spanID: 'external' };
    const span = { traceID: 't1', spanID: 's1', references: [parentRef, otherRef] };
    expect(getNonParentReferences(span)).toEqual([otherRef]);
  });
});
