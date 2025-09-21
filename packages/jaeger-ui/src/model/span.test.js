// Copyright (c) 2017 The Jaeger Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { getParent } from './span';

const mockProcess = { serviceName: 'svc', tags: [] };

// Helper function to create mock Span object
function makeSpan(overrides = {}) {
  return {
    // SpanData
    spanID: 'base',
    traceID: 't1',
    processID: 'p1',
    operationName: 'op',
    startTime: 0,
    duration: 1,
    logs: [],

    // Span fields
    depth: 0,
    hasChildren: false,
    process: mockProcess,
    relativeStartTime: 0,
    tags: [],
    references: [],
    warnings: [],
    childSpanIds: [],
    subsidiarilyReferencedBy: [],
    ...overrides,
  };
}

describe('getParent', () => {
  it('returns parent span when a CHILD_OF reference exists', () => {
    const parent = makeSpan({ spanID: 'parent' });
    const ref = {
      refType: 'CHILD_OF',
      traceID: 't1',
      spanID: 'parent',
      span: parent,
    };
    const child = makeSpan({ references: [ref] });
    expect(getParent(child)).toBe(parent);
  });

  it('returns null if references is empty', () => {
    const span = makeSpan({ references: [] });
    expect(getParent(span)).toBeNull();
  });

  it('returns null if only non-CHILD_OF reference exists', () => {
    const unrelated = makeSpan({ spanID: 'other' });
    const ref = {
      refType: 'FOLLOWS_FROM',
      traceID: 't1',
      spanID: 'other',
      span: unrelated,
    };
    const span = makeSpan({ references: [ref] });
    expect(getParent(span)).toBeNull();
  });

  it('returns first CHILD_OF if mixed references exist', () => {
    const parent = makeSpan({ spanID: 'parent' });
    const refA = {
      refType: 'FOLLOWS_FROM',
      traceID: 't1',
      spanID: 'other',
      span: null,
    };
    const refB = {
      refType: 'CHILD_OF',
      traceID: 't1',
      spanID: 'parent',
      span: parent,
    };
    const span = makeSpan({ references: [refA, refB] });
    expect(getParent(span)).toBe(parent);
  });

  it('returns null if references is explicitly undefined', () => {
    // Force type error
    const span = makeSpan();
    // @ts-expect-error: simulated value
    span.references = undefined;
    expect(getParent(span)).toBeNull();
  });

  it('should return null if CHILD_OF reference exists but its span property is null', () => {
    const nullSpanRef = {
      refType: 'CHILD_OF',
      traceID: 't1',
      spanID: 'null-span',
      span: null,
    };
    const span = makeSpan({ references: [nullSpanRef] });
    expect(getParent(span)).toBeNull();
  });
});
