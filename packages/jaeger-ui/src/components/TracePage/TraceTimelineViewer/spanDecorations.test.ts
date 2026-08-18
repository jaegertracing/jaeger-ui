// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { makeAttributes } from '../../../model/attributes';
import type { AttributeValue, IOtelSpan } from '../../../types/otel';
import { GEN_AI_KIND_META, getSpanDecorationIcon, getSpanPillsForSpan } from './spanDecorations';

function makeSpan(attributes: ReadonlyArray<{ key: string; value: AttributeValue }>): IOtelSpan {
  return {
    spanID: 's1',
    attributes: makeAttributes(attributes),
    resource: { serviceName: 'svc', attributes: makeAttributes() },
    name: 'op',
    startTime: 0,
    endTime: 1,
    duration: 1,
    childSpans: [],
    links: [],
    inboundLinks: [],
    events: [],
    status: { code: 0 },
    kind: 0,
  } as unknown as IOtelSpan;
}

describe('getSpanDecorationIcon', () => {
  it('returns a namespace icon when the span is not GenAI', () => {
    const attributes = makeAttributes([{ key: 'http.method', value: 'GET' }]);
    const decoration = getSpanDecorationIcon({ attributes });
    expect(decoration).toEqual({ icon: expect.any(Function) });
    expect(decoration?.label).toBeUndefined();
  });

  it('resolves db over http when both namespaces are present', () => {
    const dbOnly = getSpanDecorationIcon({
      attributes: makeAttributes([{ key: 'db.system', value: 'mysql' }]),
    });
    const both = getSpanDecorationIcon({
      attributes: makeAttributes([
        { key: 'db.system', value: 'mysql' },
        { key: 'http.method', value: 'GET' },
      ]),
    });
    expect(both?.icon).toBe(dbOnly?.icon);
  });

  it('prefers GenAI kind over namespace icons when both would match (#4217)', () => {
    const attributes = makeAttributes([
      { key: 'gen_ai.operation.name', value: 'chat' },
      { key: 'http.request.method', value: 'POST' },
    ]);
    const decoration = getSpanDecorationIcon({ attributes, genAIKind: 'LLM_CALL' });
    expect(decoration).toEqual({
      icon: GEN_AI_KIND_META.LLM_CALL.icon,
      label: 'LLM call',
    });
  });

  it('returns null when there is neither GenAI kind nor a namespace match', () => {
    expect(getSpanDecorationIcon({ attributes: makeAttributes([]) })).toBeNull();
  });

  it('does not treat gen_ai attributes as a namespace icon (kind axis only)', () => {
    expect(
      getSpanDecorationIcon({ attributes: makeAttributes([{ key: 'gen_ai.system', value: 'openai' }]) })
    ).toBeNull();
  });
});

describe('getSpanPillsForSpan', () => {
  it('marks a 5xx http status as an error pill', () => {
    expect(getSpanPillsForSpan(makeSpan([{ key: 'http.status_code', value: '503' }]))).toEqual([
      { label: 'http.status_code', value: '503', isError: true },
    ]);
  });

  it('emits both http pills in registry order', () => {
    expect(
      getSpanPillsForSpan(
        makeSpan([
          { key: 'http.method', value: 'GET' },
          { key: 'http.status_code', value: '200' },
        ])
      )
    ).toEqual([
      { label: 'http.status_code', value: '200' },
      { label: 'http.method', value: 'GET' },
    ]);
  });

  it('emits db.system ahead of http pills when both namespaces are present', () => {
    expect(
      getSpanPillsForSpan(
        makeSpan([
          { key: 'http.method', value: 'GET' },
          { key: 'http.status_code', value: '200' },
          { key: 'db.system', value: 'mysql' },
        ])
      )
    ).toEqual([
      { label: 'db.system', value: 'mysql' },
      { label: 'http.status_code', value: '200' },
      { label: 'http.method', value: 'GET' },
    ]);
  });
});
