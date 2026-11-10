// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { hiddenSpanIDsForServices, withoutHiddenSpans } from './spanFilter';
import genaiTestTrace from './TraceTimelineViewer/genaiTestTrace.json';
import { makeAttributes } from '../../model/attributes';
import transformTraceData from '../../model/transform-trace-data';
import { IOtelSpan } from '../../types/otel';

function makeSpan(spanID: string, serviceName: string, parentSpan?: IOtelSpan): IOtelSpan {
  return {
    spanID,
    parentSpan,
    resource: { serviceName, attributes: makeAttributes() },
  } as unknown as IOtelSpan;
}

describe('hiddenSpanIDsForServices', () => {
  const root = makeSpan('root', 'svc-a');
  const child = makeSpan('child', 'svc-b', root);
  const grandchild = makeSpan('grandchild', 'svc-c', child);
  const sibling = makeSpan('sibling', 'svc-c', root);
  const spans = [root, child, grandchild, sibling];

  it('hides nothing when no service is pruned', () => {
    expect(hiddenSpanIDsForServices(spans, new Set())).toEqual(new Set());
  });

  it('returns the same empty set every time nothing is pruned, so consumers can memoize on it', () => {
    expect(hiddenSpanIDsForServices(spans, new Set())).toBe(hiddenSpanIDsForServices([root], new Set()));
  });

  it('hides the whole trace when the root service is pruned', () => {
    expect(hiddenSpanIDsForServices(spans, new Set(['svc-a']))).toEqual(
      new Set(['root', 'child', 'grandchild', 'sibling'])
    );
  });

  it('hides nothing when there are no spans', () => {
    expect(hiddenSpanIDsForServices(null, new Set(['svc-a']))).toEqual(new Set());
  });

  it('hides the spans of a pruned service and their descendants', () => {
    expect(hiddenSpanIDsForServices(spans, new Set(['svc-b']))).toEqual(new Set(['child', 'grandchild']));
  });

  it('leaves a span of a pruned service visible only when nothing above it is pruned', () => {
    expect(hiddenSpanIDsForServices(spans, new Set(['svc-c']))).toEqual(new Set(['grandchild', 'sibling']));
  });

  it('treats a GenAI span as hidden when a plain ancestor service is pruned', () => {
    const trace = transformTraceData(genaiTestTrace as never)!.asOtelTrace();
    const nestedLlm = trace.spans.find(
      s => s.resource.serviceName === 'summarizer-agent' && s.genAIKind !== undefined
    )!;
    const plainLeafServices = new Set([
      'auth-service',
      'metrics-backend',
      'trace-store',
      'k8s-api',
      'vector-store',
    ]);
    expect(hiddenSpanIDsForServices(trace.spans, new Set(['mcp-gateway'])).has(nestedLlm.spanID)).toBe(true);
    expect(hiddenSpanIDsForServices(trace.spans, plainLeafServices).has(nestedLlm.spanID)).toBe(false);
  });
});

describe('withoutHiddenSpans', () => {
  it('returns the input unchanged when nothing is hidden', () => {
    const ids = new Set(['s1']);
    expect(withoutHiddenSpans(ids, new Set())).toBe(ids);
  });

  it('returns the input unchanged when it is null', () => {
    expect(withoutHiddenSpans(null, new Set(['s1']))).toBeNull();
  });

  it('removes the hidden spans', () => {
    expect(withoutHiddenSpans(new Set(['s1', 's2']), new Set(['s1']))).toEqual(new Set(['s2']));
  });

  it('returns null when every span is hidden', () => {
    expect(withoutHiddenSpans(new Set(['s1']), new Set(['s1', 's2']))).toBeNull();
  });
});
