// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { makeAttributes } from './attributes';
import type { IAttribute } from '../types/otel';

describe('makeAttributes', () => {
  const sample: IAttribute[] = [
    { key: 'http.method', value: 'GET' },
    { key: 'http.status_code', value: 500 },
    { key: 'ok', value: true },
  ];

  it('getValue returns the value for a present key', () => {
    const attrs = makeAttributes(sample);
    expect(attrs.getValue('http.method')).toBe('GET');
    expect(attrs.getValue('http.status_code')).toBe(500);
    expect(attrs.getValue('ok')).toBe(true);
  });

  it('getValue returns undefined for an absent key', () => {
    expect(makeAttributes(sample).getValue('missing')).toBeUndefined();
  });

  it('has reflects presence', () => {
    const attrs = makeAttributes(sample);
    expect(attrs.has('ok')).toBe(true);
    expect(attrs.has('missing')).toBe(false);
  });

  it('is first-wins on duplicate keys (matches the historical .find semantics)', () => {
    const attrs = makeAttributes([
      { key: 'k', value: 'first' },
      { key: 'k', value: 'second' },
    ]);
    expect(attrs.getValue('k')).toBe('first');
    // but both occurrences are preserved in entries()
    expect(attrs.entries()).toHaveLength(2);
  });

  it('keys returns unique keys', () => {
    const attrs = makeAttributes([
      { key: 'a', value: 1 },
      { key: 'a', value: 2 },
      { key: 'b', value: 3 },
    ]);
    expect(attrs.keys()).toEqual(['a', 'b']);
  });

  it('entries returns the underlying array (same reference across calls)', () => {
    const attrs = makeAttributes(sample);
    expect(attrs.entries()).toEqual(sample);
    expect(attrs.entries()).toBe(attrs.entries());
  });

  it('size counts all entries including duplicate keys', () => {
    expect(makeAttributes(sample).size).toBe(3);
    expect(
      makeAttributes([
        { key: 'k', value: 1 },
        { key: 'k', value: 2 },
      ]).size
    ).toBe(2);
  });

  it('handles the empty collection', () => {
    const attrs = makeAttributes();
    expect(attrs.size).toBe(0);
    expect(attrs.keys()).toEqual([]);
    expect(attrs.entries()).toEqual([]);
    expect(attrs.has('x')).toBe(false);
    expect(attrs.getValue('x')).toBeUndefined();
  });
});
