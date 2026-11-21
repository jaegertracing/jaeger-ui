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

  it('applies a pad_start formatter from the template', () => {
    expect(stringSupplant('id: #{traceId | pad_start 10 0}', { traceId: '123' })).toBe('id: 0000000123');
  });

  it('applies an add formatter from the template', () => {
    expect(stringSupplant('t: #{startTime | add 1000}', { startTime: 5 })).toBe('t: 1005');
  });

  it('chains multiple formatters from the template', () => {
    const startTime = new Date('2020-01-01').getTime() * 1000;
    expect(stringSupplant('t: #{startTime | add 60000000 | epoch_micros_to_date_iso}', { startTime })).toBe(
      't: 2020-01-01T00:01:00.000Z'
    );
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

    it('applies the formatter before encoding when both are provided', () => {
      const upper = str => String(str).toUpperCase();
      expect(encodedStringSupplant('id: #{name | pad_start 5 x}', upper, { name: 'ab' })).toBe('id: XXXAB');
    });

    it('returns the formatted value when no encoder is provided', () => {
      expect(encodedStringSupplant('id: #{traceId | pad_start 10 0}', null, { traceId: '123' })).toBe(
        'id: 0000000123'
      );
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
