// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { parseOtelTrace } from './parser';
import type { TracesDataWire } from './schemas';

describe('OTLP parser benchmarks', () => {
  const numSpans = 10000;
  const startTime = 1784570820629325000n;
  const data: TracesDataWire = {
    resourceSpans: [
      {
        resource: { attributes: [{ key: 'service.name', value: { stringValue: 'test-service' } }] },
        scopeSpans: [
          {
            scope: { name: 'benchmark' },
            spans: Array.from({ length: numSpans }, (_, index) => ({
              traceId: '0123456789abcdef0123456789abcdef',
              spanId: (index + 1).toString(16).padStart(16, '0'),
              parentSpanId: index > 0 ? index.toString(16).padStart(16, '0') : undefined,
              name: `op-${index}`,
              kind: 2,
              startTimeUnixNano: (startTime + BigInt(index) * 1000n).toString(),
              endTimeUnixNano: (startTime + BigInt(index + 10) * 1000n).toString(),
              attributes: [{ key: 'benchmark.index', value: { intValue: String(index) } }],
              events: [
                {
                  name: 'event',
                  timeUnixNano: (startTime + BigInt(index + 1) * 1000n).toString(),
                  attributes: [],
                },
              ],
            })),
          },
        ],
      },
    ],
  };

  it('benchmark: parse and enrich a trace', () => {
    const start = performance.now();
    const trace = parseOtelTrace(data)!;
    const elapsed = performance.now() - start;
    console.log(`OTLP parse and enrichment for ${numSpans} spans: ${elapsed.toFixed(4)}ms`);
    expect(trace.spans).toHaveLength(numSpans);
    expect(trace.spans[numSpans - 1].depth).toBe(numSpans - 1);
    expect(trace.spans[numSpans - 1].events[0].timestamp).toBe(trace.startTime + numSpans);
  });
});
