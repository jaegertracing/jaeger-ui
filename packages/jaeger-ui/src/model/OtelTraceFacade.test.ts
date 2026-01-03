// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import OtelTraceFacade from './OtelTraceFacade';
import { Trace, Span, Process } from '../types/trace';

describe('OtelTraceFacade', () => {
  const mockProcess: Process = {
    serviceName: 'test-service',
    tags: [],
  };

  const mockSpan: Span = {
    traceID: 'trace-1',
    spanID: 'span-1',
    operationName: 'test-op',
    startTime: 1000,
    duration: 500,
    processID: 'p1',
    process: mockProcess,
    tags: [],
    logs: [],
    references: [],
    depth: 0,
    hasChildren: false,
    relativeStartTime: 0,
    childSpans: [],
    warnings: [],
    subsidiarilyReferencedBy: [],
  };

  const mockLegacyTrace: Trace = {
    traceID: 'trace-1',
    spans: [mockSpan],
    processes: { p1: mockProcess },
    duration: 500,
    startTime: 1000,
    endTime: 1500,
    traceName: 'test-trace',
    tracePageTitle: 'test-trace-title',
    traceEmoji: '😀',
    services: [{ name: 'test-service', numberOfSpans: 1 }],
    spanMap: new Map([[mockSpan.spanID, mockSpan]]),
    rootSpans: [mockSpan],
    asOtelTrace() {
      throw new Error('Not implemented');
    },
  };

  let facade: OtelTraceFacade;

  beforeEach(() => {
    facade = new OtelTraceFacade(mockLegacyTrace);
  });

  it('maps basic trace fields', () => {
    expect(facade.traceId).toBe('trace-1');
    expect(facade.traceName).toBe('test-trace');
    expect(facade.durationMicros).toBe(500);
    expect(facade.startTimeUnixMicros).toBe(1000);
    expect(facade.endTimeUnixMicros).toBe(1500);
  });

  it('maps spans to OtelSpanFacade instances', () => {
    expect(facade.spans).toHaveLength(1);
    expect(facade.spans[0].spanId).toBe('span-1');
    expect(facade.spans[0].name).toBe('test-op');
  });

  it('maps services summary', () => {
    expect(facade.services).toEqual([{ name: 'test-service', numberOfSpans: 1 }]);
  });

  describe('span wiring', () => {
    const parentSpan: Span = { ...mockSpan, spanID: 'parent', hasChildren: true };
    const childSpan: Span = {
      ...mockSpan,
      spanID: 'child',
      references: [{ refType: 'CHILD_OF', traceID: 'trace-1', spanID: 'parent', span: parentSpan }],
    };
    const linkSpan: Span = { ...mockSpan, spanID: 'link' };

    // Set up child reference on parent
    (parentSpan as any).childSpans = [childSpan];
    // Set up link reference on child
    (childSpan as any).subsidiarilyReferencedBy = [
      { refType: 'FOLLOWS_FROM', traceID: 'trace-1', spanID: 'link', span: linkSpan },
    ];

    const complexTrace: Trace = {
      ...mockLegacyTrace,
      spans: [parentSpan, childSpan, linkSpan],
      spanMap: new Map([
        ['parent', parentSpan],
        ['child', childSpan],
        ['link', linkSpan],
      ]),
      rootSpans: [parentSpan],
    };

    it('wires up parentSpan and childSpans correctly', () => {
      const complexFacade = new OtelTraceFacade(complexTrace);
      const parentFacade = complexFacade.spanMap.get('parent')!;
      const childFacade = complexFacade.spanMap.get('child')!;

      expect(childFacade.parentSpanId).toBe('parent');
      expect(childFacade.parentSpan).toBe(parentFacade);
      expect(parentFacade.childSpans).toContain(childFacade);
      expect(parentFacade.hasChildren).toBe(true);
    });

    it('wires up link span references correctly', () => {
      const complexFacade = new OtelTraceFacade(complexTrace);
      const childFacade = complexFacade.spanMap.get('child')!;
      const linkFacade = complexFacade.spanMap.get('link')!;

      // Check links (not explicitly set in this mock, but let's test the mechanism)
      // Actually, my populator uses inboundLinks which I set
      expect(childFacade.inboundLinks).toHaveLength(1);
      expect(childFacade.inboundLinks[0].spanId).toBe('link');
      expect(childFacade.inboundLinks[0].span).toBe(linkFacade);
    });
  });
});
