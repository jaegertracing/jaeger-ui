// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { getSpanIconComponent } from './span-icons';
import { makeAttributes } from '../../../model/attributes';

function makeAttrs(attrKeys: string[]) {
  return makeAttributes(attrKeys.map(key => ({ key, value: 'test' })));
}

describe('getSpanIconComponent', () => {
  it.each(['gen_ai', 'db', 'http', 'messaging', 'rpc'])('returns an icon for %s attributes', ns => {
    expect(getSpanIconComponent(makeAttrs([`${ns}.system`]))).not.toBeNull();
  });

  it('returns null for unrecognized namespace', () => {
    expect(getSpanIconComponent(makeAttrs(['custom.attr']))).toBeNull();
  });

  it('returns null for empty attributes', () => {
    expect(getSpanIconComponent(makeAttrs([]))).toBeNull();
  });

  it('returns null when attributes is undefined', () => {
    expect(getSpanIconComponent(undefined)).toBeNull();
  });

  it('gen_ai takes priority over db when both present', () => {
    const genAiOnly = getSpanIconComponent(makeAttrs(['gen_ai.system']));
    expect(getSpanIconComponent(makeAttrs(['gen_ai.system', 'db.system']))).toBe(genAiOnly);
    expect(getSpanIconComponent(makeAttrs(['db.system', 'gen_ai.system']))).toBe(genAiOnly);
  });

  it('returns a consistent icon regardless of attribute order within the same namespace', () => {
    const result1 = getSpanIconComponent(makeAttrs(['db.system', 'db.name']));
    const result2 = getSpanIconComponent(makeAttrs(['db.name', 'db.system']));
    expect(result1).toBe(result2);
  });
});
