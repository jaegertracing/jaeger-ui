// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import OtelTraceFacade from './OtelTraceFacade';
import { Trace, Span } from '../types/trace';
import TreeNode from '../utils/TreeNode';

describe('OtelFacade Benchmarks', () => {
  const numSpans = 10000;
  const spans: Span[] = Array.from({ length: numSpans }, (_, i) => ({
    spanID: `span-${i}`,
    traceID: 'test-trace',
    processID: 'p1',
    operationName: `op-${i}`,
    startTime: i,
    duration: 10,
    logs: [],
    tags: [{ key: 'span.kind', value: 'server' }],
    references:
      i > 0
        ? [{ refType: 'CHILD_OF' as const, spanID: `span-${i - 1}`, traceID: 'test-trace', span: null }]
        : [],
    depth: i,
    hasChildren: true,
    process: { serviceName: 'test-service', tags: [] },
    relativeStartTime: i,
    childSpanIds: [],
    warnings: [],
    subsidiarilyReferencedBy: [],
  }));
  const mockTrace: Trace = {
    traceID: 'test-trace',
    traceName: 'test-trace',
    tracePageTitle: 'test-trace',
    traceEmoji: '',
    duration: 1000,
    startTime: 0,
    endTime: 1000,
    services: [{ name: 'test-service', numberOfSpans: numSpans }],
    processes: {
      p1: { serviceName: 'test-service', tags: [] },
    },
    spans,
    spanMap: new Map(spans.map(s => [s.spanID, s])),
    tree: new TreeNode('__root__'),
    asOtelTrace() {
      throw new Error('Not implemented');
    },
  };

  it('benchmark: facade creation and access', () => {
    const start = performance.now();
    const facade = new OtelTraceFacade(mockTrace);
    const end = performance.now();
    const creationTime = end - start;

    console.log(`Facade creation for ${numSpans} spans: ${creationTime.toFixed(4)}ms`);

    const startAccess = performance.now();
    const spans = facade.spans;
    spans.forEach(span => {
      // Access pre-computed fields
      const _k = span.kind;
      const _p = span.parentSpanId;
      const _a = span.attributes;
    });
    const endAccess = performance.now();
    const accessTime = endAccess - startAccess;

    console.log(
      `Accessing kind, parentSpanId, and attributes for ${numSpans} spans: ${accessTime.toFixed(4)}ms`
    );

    expect(creationTime).toBeLessThan(100); // Expect creation to be fast (<100ms for 10k spans)
    expect(accessTime).toBeLessThan(50); // Expect access to be very fast (<50ms for 10k spans)
  });
});
