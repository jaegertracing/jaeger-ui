// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { makeAttributes } from '../../../model/attributes';
import {
  GEN_AI_KIND_META,
  GEN_AI_OPERATION_TO_KIND,
  NAMESPACE_ICONS,
  PILL_SOURCES,
  getNamespaceIconComponent,
  getSpanDecorationIcon,
} from './spanDecorations';

describe('spanDecorations registry', () => {
  it('keeps icon priorities unique and ascending with namespace order', () => {
    const priorities = NAMESPACE_ICONS.map(e => e.priority);
    expect(new Set(priorities).size).toBe(priorities.length);
    expect([...priorities].sort((a, b) => a - b)).toEqual(priorities);
  });

  it('preserves pill emission order independent of icon priority', () => {
    expect(PILL_SOURCES.map(s => s.label)).toEqual([
      'http.status_code',
      'http.method',
      'db.system',
      'rpc.system',
      'gen_ai.request.model',
    ]);
  });

  it('prefers stable OTel attribute key aliases for db/rpc system pills', () => {
    expect(PILL_SOURCES.find(s => s.label === 'db.system')?.attrKeys).toEqual([
      'db.system.name',
      'db.system',
    ]);
    expect(PILL_SOURCES.find(s => s.label === 'rpc.system')?.attrKeys).toEqual([
      'rpc.system.name',
      'rpc.system',
    ]);
  });

  it('does not register a category-only pill (redundancy rule)', () => {
    const labels = PILL_SOURCES.map(s => s.label);
    expect(labels).not.toContain('span.kind');
    for (const { namespace } of NAMESPACE_ICONS) {
      expect(labels).not.toContain(namespace);
    }
  });

  it('documents messaging as icon-only until messaging.system lands', () => {
    expect(NAMESPACE_ICONS.some(e => e.namespace === 'messaging')).toBe(true);
    expect(PILL_SOURCES.map(s => s.label)).not.toContain('messaging.system');
  });

  it('does not register a gen_ai namespace icon (GenAI uses kind icons)', () => {
    expect(NAMESPACE_ICONS.map(e => e.namespace)).not.toContain('gen_ai');
  });

  it('maps known gen_ai.operation.name values to kinds', () => {
    expect(GEN_AI_OPERATION_TO_KIND.chat).toBe('LLM_CALL');
    expect(GEN_AI_OPERATION_TO_KIND.execute_tool).toBe('TOOL_CALL');
    expect(GEN_AI_OPERATION_TO_KIND.invoke_agent).toBe('AGENT');
    expect(GEN_AI_OPERATION_TO_KIND.retrieval).toBe('RETRIEVAL');
  });

  it('exposes icon+label meta for every GenAI kind', () => {
    for (const kind of ['LLM_CALL', 'TOOL_CALL', 'AGENT', 'RETRIEVAL', 'UNKNOWN_GENAI'] as const) {
      expect(GEN_AI_KIND_META[kind].icon).toBeDefined();
      expect(GEN_AI_KIND_META[kind].label.length).toBeGreaterThan(0);
    }
  });
});

describe('getSpanDecorationIcon', () => {
  it('returns a namespace icon when the span is not GenAI', () => {
    const attributes = makeAttributes([{ key: 'http.method', value: 'GET' }]);
    const decoration = getSpanDecorationIcon({ attributes });
    expect(decoration).toEqual({
      icon: getNamespaceIconComponent(attributes),
      isGenAI: false,
    });
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
      isGenAI: true,
    });
  });

  it('returns null when there is neither GenAI kind nor a namespace match', () => {
    expect(getSpanDecorationIcon({ attributes: makeAttributes([]) })).toBeNull();
  });
});
