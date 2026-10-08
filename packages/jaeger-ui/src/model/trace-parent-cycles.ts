// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Remove one parent edge per cycle before traversal, returning the new roots.
 * unlinkParent must only clear the span's parent relationship; it must not modify
 * childSpans, which this helper updates before calling unlinkParent.
 */
export function breakParentCycles<
  T extends { spanID: string; childSpans: T[]; warnings: ReadonlyArray<string> | null },
>(spans: ReadonlyArray<T>, getParent: (span: T) => T | undefined, unlinkParent: (span: T) => void): T[] {
  // 1 marks the current path; 2 marks a completed path.
  const state = new Map<T, 1 | 2>();
  const roots: T[] = [];

  for (const start of spans) {
    if (state.has(start)) continue;

    const path: T[] = [];
    let current: T | undefined = start;
    while (current && !state.has(current)) {
      state.set(current, 1);
      path.push(current);
      current = getParent(current);
    }

    if (current && state.get(current) === 1) {
      const formerParent = getParent(current)!;
      const childIndex = formerParent.childSpans.indexOf(current);
      if (childIndex >= 0) formerParent.childSpans.splice(childIndex, 1);
      unlinkParent(current);
      current.warnings = [
        ...(current.warnings ?? []),
        `Cyclic parent reference to ${formerParent.spanID} removed`,
      ];
      roots.push(current);
    }

    for (const span of path) state.set(span, 2);
  }

  return roots;
}
