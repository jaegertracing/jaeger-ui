// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { breakParentCycles } from './trace-parent-cycles';

interface ITestSpan {
  spanID: string;
  childSpans: ITestSpan[];
  warnings: ReadonlyArray<string> | null;
  parent?: ITestSpan;
}

const span = (spanID: string): ITestSpan => ({ spanID, childSpans: [], warnings: null });
const link = (child: ITestSpan, parent: ITestSpan) => {
  child.parent = parent;
  parent.childSpans.push(child);
};
const repair = (spans: ReadonlyArray<ITestSpan>) =>
  breakParentCycles(
    spans,
    child => child.parent,
    child => {
      child.parent = undefined;
    }
  );

describe('breakParentCycles', () => {
  it('keeps an acyclic graph and its existing warnings unchanged', () => {
    const root = span('root');
    const child = span('child');
    link(child, root);
    child.warnings = ['existing'];
    expect(repair([child, root])).toEqual([]);
    expect(child.parent).toBe(root);
    expect(root.childSpans).toEqual([child]);
    expect(child.warnings).toEqual(['existing']);
    expect(root.warnings).toBeNull();
  });

  it('cuts one edge per cycle while preserving descendants and previous warnings', () => {
    const a = span('a');
    const b = span('b');
    const leaf = span('leaf');
    const self = span('self');
    link(a, b);
    link(b, a);
    link(leaf, b);
    link(self, self);
    a.warnings = ['existing'];
    expect(repair([a, b, leaf, self])).toEqual([a, self]);
    expect(a.parent).toBeUndefined();
    expect(b.parent).toBe(a);
    expect(b.childSpans).toEqual([leaf]);
    expect(leaf.parent).toBe(b);
    expect(a.warnings).toEqual(['existing', 'Cyclic parent reference to b removed']);
    expect(self.childSpans).toEqual([]);
    expect(self.warnings).toEqual(['Cyclic parent reference to self removed']);
    expect(repair([a, b, leaf, self])).toEqual([]);
  });

  it('does not remove an unrelated child when the cycle edge is absent from childSpans', () => {
    const a = span('a');
    const b = span('b');
    const leaf = span('leaf');
    a.parent = b;
    link(b, a);
    link(leaf, b);
    expect(repair([a, b, leaf])).toEqual([a]);
    expect(b.childSpans).toEqual([leaf]);
  });

  it('repairs a deep cycle without recursion', () => {
    const spans = Array.from({ length: 20000 }, (_, index) => span(String(index)));
    spans.forEach((child, index) => link(child, spans[(index + 1) % spans.length]));
    expect(repair(spans)).toEqual([spans[0]]);
    expect(spans[0].parent).toBeUndefined();
    expect(spans[1].childSpans).toEqual([]);
  });
});
