// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { deduplicateAttributes, orderAttributes } from './trace-attributes';

describe('orderAttributes()', () => {
  it('orders attributes by configured prefixes and case-insensitive keys', () => {
    expect(
      orderAttributes(
        [
          { key: 'b.ip', value: '8.8.4.4' },
          { key: 'http.Status_code', value: '200' },
          { key: 'z.ip', value: '8.8.8.16' },
          { key: 'a.ip', value: '8.8.8.8' },
          { key: 'http.message', value: 'ok' },
        ],
        ['z.', 'a.', 'HTTP.']
      )
    ).toEqual([
      { key: 'z.ip', value: '8.8.8.16' },
      { key: 'a.ip', value: '8.8.8.8' },
      { key: 'http.message', value: 'ok' },
      { key: 'http.Status_code', value: '200' },
      { key: 'b.ip', value: '8.8.4.4' },
    ]);
  });

  it('keeps input order for equal case-insensitive keys without mutating the input', () => {
    const first = Object.freeze({ key: 'B', value: false });
    const second = Object.freeze({ key: 'b', value: 0 });
    const third = Object.freeze({ key: 'a', value: '' });
    const attributes = Object.freeze([first, second, third]);

    const ordered = orderAttributes(attributes);

    expect(ordered).toEqual([third, first, second]);
    expect(ordered[0]).toBe(third);
    expect(ordered[1]).toBe(first);
    expect(ordered[2]).toBe(second);
    expect(attributes).toEqual([first, second, third]);
  });

  it('uses the first configured prefix when prefixes overlap', () => {
    const attributes = [
      { key: 'http.z', value: 1 },
      { key: 'http.client.a', value: 2 },
      { key: 'other', value: 3 },
    ];

    expect(orderAttributes(attributes, ['HTTP.CLIENT.', 'http.'])).toEqual([
      attributes[1],
      attributes[0],
      attributes[2],
    ]);
  });

  it('returns an empty array for no attributes', () => {
    expect(orderAttributes([])).toEqual([]);
  });
});

describe('deduplicateAttributes()', () => {
  it('deduplicates equal key/value pairs and preserves different values', () => {
    const result = deduplicateAttributes([
      { key: 'b.ip', value: '8.8.4.4' },
      { key: 'b.ip', value: '8.8.8.8' },
      { key: 'b.ip', value: '8.8.4.4' },
      { key: 'a.ip', value: '8.8.8.8' },
    ]);

    expect(result.attributes).toEqual([
      { key: 'b.ip', value: '8.8.4.4' },
      { key: 'b.ip', value: '8.8.8.8' },
      { key: 'a.ip', value: '8.8.8.8' },
    ]);
    expect(result.warnings).toEqual(['Duplicate tag key="b.ip" value="8.8.4.4"']);
  });

  it('collapses repeated duplicates into a single warning and keeps the first', () => {
    const first = Object.freeze({ key: 'x', value: 'a' });
    const attributes = Object.freeze([first, { key: 'x', value: 'a' }, { key: 'x', value: 'a' }]);

    const result = deduplicateAttributes(attributes);

    expect(result.attributes).toEqual([first]);
    expect(result.attributes[0]).toBe(first);
    expect(result.warnings).toEqual(['Duplicate tag key="x" value="a"']);
    expect(attributes).toHaveLength(3);
  });

  it('does not collide when key or value contains a colon', () => {
    const result = deduplicateAttributes([
      { key: 'a:b', value: 'c' },
      { key: 'a', value: 'b:c' },
    ]);

    expect(result.attributes).toHaveLength(2);
    expect(result.warnings).toEqual([]);
  });

  it('reports both duplicates when colliding key/value pairs are each duplicated', () => {
    const result = deduplicateAttributes([
      { key: 'a:b', value: 'c' },
      { key: 'a:b', value: 'c' },
      { key: 'a', value: 'b:c' },
      { key: 'a', value: 'b:c' },
    ]);

    expect(result.attributes).toEqual([
      { key: 'a:b', value: 'c' },
      { key: 'a', value: 'b:c' },
    ]);
    expect(result.warnings).toEqual([
      'Duplicate tag key="a:b" value="c"',
      'Duplicate tag key="a" value="b:c"',
    ]);
  });

  it('preserves distinct duplicate warnings when mixed-type values stringify the same', () => {
    const result = deduplicateAttributes([
      { key: 'x', value: 1 },
      { key: 'x', value: 1 },
      { key: 'x', value: '1' },
      { key: 'x', value: '1' },
    ]);

    expect(result.attributes).toEqual([
      { key: 'x', value: 1 },
      { key: 'x', value: '1' },
    ]);
    expect(result.warnings).toEqual(['Duplicate tag key="x" value="1"', 'Duplicate tag key="x" value="1"']);
  });

  it('preserves falsy values and bigint precision', () => {
    const values = ['', false, 0, 9223372036854775807n];
    const attributes = values.map(value => ({ key: 'x', value }));

    const result = deduplicateAttributes([...attributes, ...attributes]);

    expect(result.attributes).toEqual(attributes);
    expect(result.warnings).toEqual([
      'Duplicate tag key="x" value=""',
      'Duplicate tag key="x" value="false"',
      'Duplicate tag key="x" value="0"',
      'Duplicate tag key="x" value="9223372036854775807"',
    ]);
  });

  it('compares object values by identity', () => {
    const first = { key: 'x', value: { nested: 1 } };
    const second = { key: 'x', value: { nested: 1 } };

    const result = deduplicateAttributes([first, second, first]);

    expect(result.attributes).toEqual([first, second]);
    expect(result.attributes[0]).toBe(first);
    expect(result.attributes[1]).toBe(second);
    expect(result.warnings).toEqual(['Duplicate tag key="x" value="[object Object]"']);
  });

  it('returns empty attributes and warnings for no input', () => {
    expect(deduplicateAttributes([])).toEqual({ attributes: [], warnings: [] });
  });
});
