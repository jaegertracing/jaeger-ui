// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { getSpanIconComponent } from './span-icons';
import { makeAttributes } from '../../../model/attributes';

function makeAttrs(attrKeys: string[]) {
  return makeAttributes(attrKeys.map(key => ({ key, value: 'test' })));
}

describe('getSpanIconComponent', () => {
  it.each(['db', 'http', 'messaging', 'rpc'])('returns an icon for %s attributes', ns => {
    expect(getSpanIconComponent(makeAttrs([`${ns}.system`]))).not.toBeNull();
  });

  it('returns null for gen_ai attributes - GenAISpanIcon renders the kind-specific icon for those instead, not this generic one', () => {
    expect(getSpanIconComponent(makeAttrs(['gen_ai.system']))).toBeNull();
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

  it('db takes priority over http when both present', () => {
    const dbOnly = getSpanIconComponent(makeAttrs(['db.system']));
    expect(getSpanIconComponent(makeAttrs(['db.system', 'http.system']))).toBe(dbOnly);
    expect(getSpanIconComponent(makeAttrs(['http.system', 'db.system']))).toBe(dbOnly);
  });

  it('returns a consistent icon regardless of attribute order within the same namespace', () => {
    const result1 = getSpanIconComponent(makeAttrs(['db.system', 'db.name']));
    const result2 = getSpanIconComponent(makeAttrs(['db.name', 'db.system']));
    expect(result1).toBe(result2);
  });
});
