// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/*
  Decides if the input looks like a trace/compare ID (hex patterns) vs free text.
  That chooses navigate to trace vs send to the assistant.
*/
export function isTraceIdLookupQuery(raw: string): boolean {
  const s = raw.trim();
  if (!s) {
    return false;
  }
  const hexSeg = /^[0-9a-fA-F]{8,32}$/;
  if (s.includes('...')) {
    const parts = s.split('...');
    if (parts.length !== 2) {
      return false;
    }
    const [rawA, rawB] = parts;
    const a = rawA.trim();
    const b = rawB.trim();
    if (!a || !b) {
      return false;
    }
    return hexSeg.test(a) && hexSeg.test(b);
  }
  return hexSeg.test(s);
}
