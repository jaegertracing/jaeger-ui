// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import OtelSpanFacade from './OtelSpanFacade';
import { Span, Process } from '../types/trace';
import { SpanKind, StatusCode } from '../types/otel';

describe('OtelSpanFacade', () => {
  const mockProcess: Process = {
    serviceName: 'test-service',
    tags: [{ key: 'res-tag', value: 'res-val' }],
  };

  const mockLegacySpan: Span = {
    traceID: 'trace-1',
    spanID: 'span-1',
    operationName: 'test-op',
    startTime: 1000,
    duration: 500,
    processID: 'p1',
    process: mockProcess,
    tags: [
      { key: 'span.kind', value: 'server' },
      { key: 'error', value: 'true' },
      { key: 'http.method', value: 'GET' },
      { key: 'otel.library.name', value: 'test-lib' },
    ],
    logs: [
      {
        timestamp: 1100,
        fields: [
          { key: 'event', value: 'test-event' },
          { key: 'foo', value: 'bar' },
        ],
      },
    ],
    references: [
      { refType: 'CHILD_OF', traceID: 'trace-1', spanID: 'parent-1', span: null },
      { refType: 'FOLLOWS_FROM', traceID: 'trace-1', spanID: 'link-1', span: null },
    ],
    depth: 1,
    hasChildren: true,
    relativeStartTime: 100,
    childSpans: [],
    warnings: [],
    subsidiarilyReferencedBy: [
      { refType: 'FOLLOWS_FROM', traceID: 'trace-1', spanID: 'sub-ref-1', span: null },
    ],
  };

  let facade: OtelSpanFacade;

  beforeEach(() => {
    facade = new OtelSpanFacade(mockLegacySpan);
  });

  it('maps basic identity fields', () => {
    expect(facade.traceId).toBe('trace-1');
    expect(facade.spanId).toBe('span-1');
    expect(facade.name).toBe('test-op');
  });

  it('maps parentSpanId from CHILD_OF reference', () => {
    expect(facade.parentSpanId).toBe('parent-1');
  });

  describe('parentSpanId calculation', () => {
    it('uses CHILD_OF reference with same traceID', () => {
      const span: Span = {
        ...mockLegacySpan,
        traceID: 'trace-1',
        references: [{ refType: 'CHILD_OF', traceID: 'trace-1', spanID: 'parent-1', span: null }],
      };
      const spanFacade = new OtelSpanFacade(span);
      expect(spanFacade.parentSpanId).toBe('parent-1');
    });

    it('ignores CHILD_OF reference with different traceID', () => {
      const span: Span = {
        ...mockLegacySpan,
        traceID: 'trace-1',
        references: [{ refType: 'CHILD_OF', traceID: 'trace-2', spanID: 'parent-1', span: null }],
      };
      const spanFacade = new OtelSpanFacade(span);
      expect(spanFacade.parentSpanId).toBeUndefined();
    });

    it('uses earliest CHILD_OF reference when multiple exist with same traceID', () => {
      const span: Span = {
        ...mockLegacySpan,
        traceID: 'trace-1',
        references: [
          { refType: 'CHILD_OF', traceID: 'trace-1', spanID: 'parent-1', span: null },
          { refType: 'CHILD_OF', traceID: 'trace-1', spanID: 'parent-2', span: null },
        ],
      };
      const spanFacade = new OtelSpanFacade(span);
      expect(spanFacade.parentSpanId).toBe('parent-1');
    });

    it('uses FOLLOWS_FROM reference with same traceID when no CHILD_OF exists', () => {
      const span: Span = {
        ...mockLegacySpan,
        traceID: 'trace-1',
        references: [{ refType: 'FOLLOWS_FROM', traceID: 'trace-1', spanID: 'link-1', span: null }],
      };
      const spanFacade = new OtelSpanFacade(span);
      expect(spanFacade.parentSpanId).toBe('link-1');
    });

    it('uses earliest FOLLOWS_FROM reference when multiple exist with same traceID and no CHILD_OF', () => {
      const span: Span = {
        ...mockLegacySpan,
        traceID: 'trace-1',
        references: [
          { refType: 'FOLLOWS_FROM', traceID: 'trace-1', spanID: 'link-1', span: null },
          { refType: 'FOLLOWS_FROM', traceID: 'trace-1', spanID: 'link-2', span: null },
        ],
      };
      const spanFacade = new OtelSpanFacade(span);
      expect(spanFacade.parentSpanId).toBe('link-1');
    });

    it('prefers CHILD_OF with same traceID over FOLLOWS_FROM', () => {
      const span: Span = {
        ...mockLegacySpan,
        traceID: 'trace-1',
        references: [
          { refType: 'FOLLOWS_FROM', traceID: 'trace-1', spanID: 'link-1', span: null },
          { refType: 'CHILD_OF', traceID: 'trace-1', spanID: 'parent-1', span: null },
        ],
      };
      const spanFacade = new OtelSpanFacade(span);
      expect(spanFacade.parentSpanId).toBe('parent-1');
    });

    it('returns undefined when no references have same traceID', () => {
      const span: Span = {
        ...mockLegacySpan,
        traceID: 'trace-1',
        references: [
          { refType: 'CHILD_OF', traceID: 'trace-2', spanID: 'parent-1', span: null },
          { refType: 'FOLLOWS_FROM', traceID: 'trace-3', spanID: 'link-1', span: null },
        ],
      };
      const spanFacade = new OtelSpanFacade(span);
      expect(spanFacade.parentSpanId).toBeUndefined();
    });

    it('returns undefined when no references exist', () => {
      const span: Span = {
        ...mockLegacySpan,
        traceID: 'trace-1',
        references: [],
      };
      const spanFacade = new OtelSpanFacade(span);
      expect(spanFacade.parentSpanId).toBeUndefined();
    });

    it('ignores CHILD_OF with different traceID but uses FOLLOWS_FROM with same traceID', () => {
      const span: Span = {
        ...mockLegacySpan,
        traceID: 'trace-1',
        references: [
          { refType: 'CHILD_OF', traceID: 'trace-2', spanID: 'parent-1', span: null },
          { refType: 'FOLLOWS_FROM', traceID: 'trace-1', spanID: 'link-1', span: null },
        ],
      };
      const spanFacade = new OtelSpanFacade(span);
      expect(spanFacade.parentSpanId).toBe('link-1');
    });
  });

  it('maps span kind from tags', () => {
    expect(facade.kind).toBe(SpanKind.SERVER);
  });

  it('maps timing fields', () => {
    expect(facade.startTimeUnixMicros).toBe(1000);
    expect(facade.endTimeUnixMicros).toBe(1500);
    expect(facade.durationMicros).toBe(500);
  });

  it('maps attributes from tags', () => {
    expect(facade.attributes).toContainEqual({ key: 'http.method', value: 'GET' });
  });

  it('maps events from logs', () => {
    expect(facade.events).toHaveLength(1);
    expect(facade.events[0]).toMatchObject({
      timeUnixMicro: 1100,
      name: 'test-event',
      attributes: [
        { key: 'event', value: 'test-event' },
        { key: 'foo', value: 'bar' },
      ],
    });
  });

  it('maps links from non-CHILD_OF references', () => {
    expect(facade.links).toHaveLength(1);
    expect(facade.links[0].spanId).toBe('link-1');
  });

  it('maps status from error tag', () => {
    expect(facade.status.code).toBe(StatusCode.ERROR);
  });

  it('maps resource from process', () => {
    expect(facade.resource.serviceName).toBe('test-service');
    expect(facade.resource.attributes).toContainEqual({ key: 'res-tag', value: 'res-val' });
  });

  it('maps instrumentation scope from tags', () => {
    expect(facade.instrumentationScope.name).toBe('test-lib');
  });

  it('maps UI-specific fields', () => {
    expect(facade.depth).toBe(1);
    expect(facade.hasChildren).toBe(true);
    expect(facade.relativeStartTimeMicros).toBe(100);
    expect(facade.subsidiarilyReferencedBy[0].spanId).toBe('sub-ref-1');
  });
});
