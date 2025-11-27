// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import stringSupplant, { encodedStringSupplant, getParamNames } from './stringSupplant';

describe('stringSupplant', () => {
  const value0 = 'val0';
  const value1 = 'val1';

  it('replaces values', () => {
    expect(stringSupplant('key0: #{value0}; key1: #{value1}', { value0, value1 })).toBe(
      `key0: ${value0}; key1: ${value1}`
    );
  });

  it('omits missing values', () => {
    expect(stringSupplant('key0: #{value0}; key1: #{value1}', { value0 })).toBe(`key0: ${value0}; key1: `);
  });

  describe('encodedStringSupplant', () => {
    it('encodes present values', () => {
      const reverse = str => str.split('').reverse().join('');
      const encodeFn = jest.fn(reverse);
      expect(encodedStringSupplant('key0: #{value0}; key1: #{value1}', encodeFn, { value0, value1 })).toBe(
        `key0: ${reverse(value0)}; key1: ${reverse(value1)}`
      );

      const callCount = encodeFn.mock.calls.length;
      encodedStringSupplant('key0: #{value0}; key1: #{value1}', encodeFn, { value0 });
      expect(encodeFn.mock.calls.length).toBe(callCount + 1);
    });
  });
});

describe('getParamNames', () => {
  it('gets unique names', () => {
    const name0 = 'name 0';
    const name1 = 'name 1';
    expect(getParamNames(`foo #{${name0}} bar #{${name1}} baz #{${name0}}`)).toEqual([name0, name1]);
  });
});
