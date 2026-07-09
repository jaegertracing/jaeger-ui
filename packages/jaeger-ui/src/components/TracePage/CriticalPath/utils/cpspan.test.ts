// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { createCPSpanMap } from './cpspan';

describe('createCPSpanMap', () => {
  it('should not overflow stack on a chain of 15000 blocking spans', () => {
    const spans: any[] = [];
    for (let i = 0; i < 15000; i++) {
      spans.push({
        spanID: `s${i}`,
        kind: 'INTERNAL',
        startTime: 0,
        endTime: 1,
        duration: 1,
        childSpans: [],
        parentSpanID: i === 0 ? undefined : `s${i - 1}`,
      });
    }
    for (let i = 0; i < 14999; i++) spans[i].childSpans = [spans[i + 1]];
    for (let i = 1; i < 15000; i++) spans[i].parentSpan = spans[i - 1];
    expect(() => createCPSpanMap(spans[0])).not.toThrow();
  });
});
