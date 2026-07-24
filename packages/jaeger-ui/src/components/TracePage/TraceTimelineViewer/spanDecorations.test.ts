// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { DECORATION_FAMILIES, PILL_SOURCES, NAMESPACE_ICONS } from './spanDecorations';

describe('spanDecorations registry', () => {
  it('exposes one namespace icon entry per decoration family', () => {
    expect(NAMESPACE_ICONS.map(e => e.namespace)).toEqual(DECORATION_FAMILIES.map(f => f.namespace));
  });

  it('keeps icon priorities unique and ascending with family order', () => {
    const priorities = NAMESPACE_ICONS.map(e => e.priority);
    expect(new Set(priorities).size).toBe(priorities.length);
    expect([...priorities].sort((a, b) => a - b)).toEqual(priorities);
  });

  it('keeps PILL_SOURCES and family pills in sync (same object identities)', () => {
    const fromFamilies = DECORATION_FAMILIES.flatMap(f => f.pills);
    expect(PILL_SOURCES).toEqual(expect.arrayContaining(fromFamilies));
    expect(fromFamilies).toEqual(expect.arrayContaining([...PILL_SOURCES]));
  });

  it('preserves pill emission order independent of icon priority', () => {
    expect(PILL_SOURCES.map(s => s.label)).toEqual([
      'http.status_code',
      'http.method',
      'db.system',
      'rpc.system',
    ]);
  });

  it('does not register a category-only pill (redundancy rule)', () => {
    const labels = PILL_SOURCES.map(s => s.label);
    expect(labels).not.toContain('span.kind');
    // Namespace presence alone is never a pill label.
    for (const { namespace } of DECORATION_FAMILIES) {
      expect(labels).not.toContain(namespace);
    }
  });

  it('documents messaging as icon-only until messaging.system lands', () => {
    const messaging = DECORATION_FAMILIES.find(f => f.namespace === 'messaging');
    expect(messaging).toBeDefined();
    expect(messaging!.pills).toEqual([]);
  });

  it('does not register gen_ai (handled by GenAISpanIcon / classifySpan)', () => {
    expect(DECORATION_FAMILIES.map(f => f.namespace)).not.toContain('gen_ai');
  });
});
