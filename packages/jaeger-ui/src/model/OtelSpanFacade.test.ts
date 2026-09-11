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
    // Set by transformTraceData; OtelSpanFacade reads this rather than re-deriving a parent
    // from `references` itself. See https://github.com/jaegertracing/jaeger-ui/issues/4460.
    parentID: 'parent-1',
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
    expect(facade.traceID).toBe('trace-1');
    expect(facade.spanID).toBe('span-1');
    expect(facade.name).toBe('test-op');
  });

  it('maps parentSpanID from CHILD_OF reference', () => {
    expect(facade.parentSpanID).toBe('parent-1');
  });

  describe('parentSpanID calculation', () => {
    // transformTraceData is the one place that decides who a span's parent is - by walking
    // `references` in array order and taking the first CHILD_OF/FOLLOWS_FROM reference whose
    // target actually exists in the trace - and records that choice as `legacySpan.parentID`.
    // OtelSpanFacade must read that value verbatim rather than re-deriving a parent from
    // `references` itself; a second, independently-implemented resolution (e.g. one that
    // always prefers CHILD_OF regardless of reference order) can disagree with the
    // childSpans tree transformTraceData already built from its own resolution.
    // See https://github.com/jaegertracing/jaeger-ui/issues/4460.
    it('reads parentSpanID from legacySpan.parentID', () => {
      const span: Span = { ...mockLegacySpan, parentID: 'resolved-parent' };
      const spanFacade = new OtelSpanFacade(span);
      expect(spanFacade.parentSpanID).toBe('resolved-parent');
    });

    it('is undefined when legacySpan.parentID is undefined, regardless of what references imply', () => {
      // References alone must never drive parentSpanID: even though this span carries a
      // CHILD_OF reference, parentID undefined means transformTraceData found no valid
      // parent for it (a root, or every reference unresolvable) and it must stay undefined.
      const span: Span = {
        ...mockLegacySpan,
        parentID: undefined,
        references: [{ refType: 'CHILD_OF', traceID: 'trace-1', spanID: 'parent-1', span: null }],
      };
      const spanFacade = new OtelSpanFacade(span);
      expect(spanFacade.parentSpanID).toBeUndefined();
    });

    it('follows parentID even when it names a reference that is not first in array order', () => {
      // Regression case for #4460: a FOLLOWS_FROM reference listed before the CHILD_OF
      // reference that transformTraceData actually picked as the tree parent. parentSpanID
      // must match the tree, not fall back to a same-object reference scan.
      const span: Span = {
        ...mockLegacySpan,
        parentID: 'tree-parent',
        references: [
          { refType: 'FOLLOWS_FROM', traceID: 'trace-1', spanID: 'earlier-in-array', span: null },
          { refType: 'CHILD_OF', traceID: 'trace-1', spanID: 'tree-parent', span: null },
        ],
      };
      const spanFacade = new OtelSpanFacade(span);
      expect(spanFacade.parentSpanID).toBe('tree-parent');
    });
  });

  it('maps span kind from tags', () => {
    expect(facade.kind).toBe(SpanKind.SERVER);
  });

  describe('genAIKind classification', () => {
    it('classifies a span with no gen_ai.* attributes as undefined', () => {
      expect(facade.genAIKind).toBeUndefined();
    });

    it('classifies a span with a known gen_ai.operation.name', () => {
      const span: Span = {
        ...mockLegacySpan,
        tags: [...mockLegacySpan.tags, { key: 'gen_ai.operation.name', value: 'chat' }],
      };
      const spanFacade = new OtelSpanFacade(span);
      expect(spanFacade.genAIKind).toBe('LLM_CALL');
    });

    it('classifies a span with gen_ai.* attributes but no recognized operation.name as UNKNOWN_GENAI', () => {
      const span: Span = {
        ...mockLegacySpan,
        tags: [...mockLegacySpan.tags, { key: 'gen_ai.system', value: 'openai' }],
      };
      const spanFacade = new OtelSpanFacade(span);
      expect(spanFacade.genAIKind).toBe('UNKNOWN_GENAI');
    });
  });

  it('maps timing fields', () => {
    expect(facade.startTime).toBe(1000);
    expect(facade.endTime).toBe(1500);
    expect(facade.duration).toBe(500);
  });

  it('maps attributes from tags', () => {
    expect(facade.attributes.entries()).toContainEqual({ key: 'http.method', value: 'GET' });
  });

  it('maps events from logs', () => {
    expect(facade.events).toHaveLength(1);
    expect(facade.events[0].timestamp).toBe(1100);
    expect(facade.events[0].name).toBe('test-event');
    expect(facade.events[0].attributes.entries()).toEqual([
      { key: 'event', value: 'test-event' },
      { key: 'foo', value: 'bar' },
    ]);
  });

  describe('links calculation', () => {
    it('excludes the parentID reference from links', () => {
      // The mockLegacySpan's parentID ('parent-1') matches its first CHILD_OF reference.
      expect(facade.parentSpanID).toBe('parent-1');
      expect(facade.links.find(l => l.spanID === 'parent-1')).toBeUndefined();
    });

    it('includes other CHILD_OF references not matching parentID in links', () => {
      const span: Span = {
        ...mockLegacySpan,
        traceID: 'trace-1',
        parentID: 'parent-1',
        references: [
          { refType: 'CHILD_OF', traceID: 'trace-1', spanID: 'parent-1', span: null },
          { refType: 'CHILD_OF', traceID: 'trace-2', spanID: 'other-parent', span: null },
        ],
      };
      const spanFacade = new OtelSpanFacade(span);
      expect(spanFacade.parentSpanID).toBe('parent-1');
      const link = spanFacade.links.find(l => l.spanID === 'other-parent');
      expect(link).toBeDefined();
      expect(link?.traceID).toBe('trace-2');
    });

    it('includes secondary CHILD_OF references not matching parentID in links', () => {
      // Only the reference matching parentID ('parent-1') is excluded; a second CHILD_OF to
      // a different spanID is a genuine additional reference and stays a link.
      const span: Span = {
        ...mockLegacySpan,
        traceID: 'trace-1',
        parentID: 'parent-1',
        references: [
          { refType: 'CHILD_OF', traceID: 'trace-1', spanID: 'parent-1', span: null },
          { refType: 'CHILD_OF', traceID: 'trace-1', spanID: 'secondary-parent', span: null },
        ],
      };
      const spanFacade = new OtelSpanFacade(span);
      expect(spanFacade.parentSpanID).toBe('parent-1');
      const link = spanFacade.links.find(l => l.spanID === 'secondary-parent');
      expect(link).toBeDefined();
      expect(link?.traceID).toBe('trace-1');
    });

    it('includes FOLLOWS_FROM references in links', () => {
      // mockLegacySpan already has a FOLLOWS_FROM reference to 'link-1'
      const link = facade.links.find(l => l.spanID === 'link-1');
      expect(link).toBeDefined();
      expect(link?.traceID).toBe('trace-1');
    });

    it('excludes a FOLLOWS_FROM reference from links when parentID names it (fallback parent)', () => {
      // Standard for async spans like producer/consumer: transformTraceData falls back to
      // FOLLOWS_FROM as the tree parent when no CHILD_OF resolves, and records that in
      // parentID. Links must exclude that FOLLOWS_FROM reference, not just CHILD_OF ones.
      const span: Span = {
        ...mockLegacySpan,
        traceID: 'trace-1',
        parentID: 'parent-link',
        references: [{ refType: 'FOLLOWS_FROM', traceID: 'trace-1', spanID: 'parent-link', span: null }],
      };
      const spanFacade = new OtelSpanFacade(span);
      expect(spanFacade.parentSpanID).toBe('parent-link');
      expect(spanFacade.links.find(l => l.spanID === 'parent-link')).toBeUndefined();
    });

    it('excludes only the first reference matching parentID when references disagree with array order (#4460)', () => {
      // The FOLLOWS_FROM reference is listed first, but parentID says the tree actually
      // picked the CHILD_OF reference (e.g. because the FOLLOWS_FROM target was absent from
      // this trace when transformTraceData ran). Links must follow parentID, not position.
      const span: Span = {
        ...mockLegacySpan,
        traceID: 'trace-1',
        parentID: 'tree-parent',
        references: [
          { refType: 'FOLLOWS_FROM', traceID: 'trace-1', spanID: 'earlier-in-array', span: null },
          { refType: 'CHILD_OF', traceID: 'trace-1', spanID: 'tree-parent', span: null },
        ],
      };
      const spanFacade = new OtelSpanFacade(span);
      expect(spanFacade.links.map(l => l.spanID)).toEqual(['earlier-in-array']);
    });
  });

  it('maps status from error tag', () => {
    expect(facade.status.code).toBe(StatusCode.ERROR);
  });

  it('maps resource from process', () => {
    expect(facade.resource.serviceName).toBe('test-service');
    expect(facade.resource.attributes.entries()).toContainEqual({ key: 'res-tag', value: 'res-val' });
  });

  it('maps instrumentation scope from tags', () => {
    expect(facade.instrumentationScope.name).toBe('test-lib');
  });

  it('maps UI-specific fields', () => {
    expect(facade.depth).toBe(1);
    expect(facade.hasChildren).toBe(false);
    expect(facade.childSpans).toEqual([]);
    expect(facade.relativeStartTime).toBe(100);
    expect(facade.inboundLinks[0].spanID).toBe('sub-ref-1');
  });
});
