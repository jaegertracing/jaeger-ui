// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { isOtelUpload, validateOtelUpload } from './otel-upload';
import { refinedTracesData } from '../api/v3/schemas';
import numericUpload from './fixtures/otlp-upload-numeric.json';

it.each([numericUpload, { result: numericUpload }, { ...numericUpload, result: { unrelated: true } }])(
  'normalizes numeric OTLP fields without mutating input',
  input => {
    const before = JSON.stringify(input);
    const parsed = validateOtelUpload(input);
    const resource = parsed.resourceSpans![0];
    const scope = resource.scopeSpans[0];
    const span = scope.spans[0];
    expect(resource.resource!.attributes![1].value.intValue).toBe('42');
    expect(scope.scope!.attributes![0].value.intValue).toBe('-42');
    expect(span.startTimeUnixNano).toBe('1000000');
    expect(span.endTimeUnixNano).toBe('2000000');
    expect(span.events![0].timeUnixNano).toBe('1500000');
    expect(span.events![0].attributes![0].value.intValue).toBe('7');
    expect(span.links![0].attributes![0].value.intValue).toBe('9');
    expect(span.attributes![0].value.intValue).toBe('0');
    expect(span.attributes![1].value.doubleValue).toBe(1.5);
    expect(span.attributes![2].value).toEqual({
      arrayValue: {
        values: [
          { intValue: '9007199254740991' },
          {
            kvlistValue: {
              values: [
                { key: 'minimum', value: { intValue: '-9007199254740991' } },
                { key: 'exact', value: { intValue: '9223372036854775807' } },
              ],
            },
          },
        ],
      },
    });
    expect(span.futureMetadata).toEqual({ intValue: 123, timeUnixNano: 456 });
    if ('resourceSpans' in input && 'result' in input) expect(parsed.result).toEqual({ unrelated: true });
    expect(JSON.stringify(input)).toBe(before);
  }
);

it('keeps the network int64 wire contract strict', () => {
  expect(() => refinedTracesData.parse(numericUpload)).toThrow();
});

it.each(['startTimeUnixNano', 'endTimeUnixNano', 'eventTime', 'intValue'])(
  'rejects unsafe, fractional, and nonnumeric %s values',
  field => {
    for (const value of [
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
      Number.MIN_SAFE_INTEGER - 1,
      NaN,
      Infinity,
      true,
    ]) {
      const input = structuredClone(numericUpload);
      const span = input.resourceSpans[0].scopeSpans[0].spans[0];
      if (field === 'eventTime') Object.assign(span.events[0], { timeUnixNano: value });
      else if (field === 'intValue') Object.assign(span.attributes[0].value, { intValue: value });
      else Object.assign(span, { [field]: value });
      expect(() => validateOtelUpload(input)).toThrow();
    }
  }
);

it.each(['startTimeUnixNano', 'endTimeUnixNano', 'eventTime'])(
  'rejects negative numeric %s timestamps',
  field => {
    const input = structuredClone(numericUpload);
    const span = input.resourceSpans[0].scopeSpans[0].spans[0];
    if (field === 'eventTime') span.events[0].timeUnixNano = -1;
    else Object.assign(span, { [field]: -1 });
    expect(() => validateOtelUpload(input)).toThrow();
  }
);

it.each([{}, { result: {} }, { resourceSpans: [] }, { result: { resourceSpans: [] } }])(
  'recognizes an empty OTLP document or envelope',
  input => {
    expect(isOtelUpload(input)).toBe(true);
    expect(() => validateOtelUpload(input)).not.toThrow();
  }
);

it.each([null, [], 42, { result: 'text' }, { result: null }, { result: { unrelated: true } }])(
  'does not identify unrelated result fields as OTLP',
  input => {
    expect(isOtelUpload(input)).toBe(false);
  }
);

it('still validates malformed OTLP envelopes instead of treating them as legacy uploads', () => {
  const input = { result: { resourceSpans: null } };
  expect(isOtelUpload(input)).toBe(true);
  expect(() => validateOtelUpload(input)).toThrow();
});

it('defaults omitted repeated fields without accepting malformed arrays', () => {
  expect(validateOtelUpload({ resourceSpans: [{}, { scopeSpans: [{}] }] })).toEqual({
    resourceSpans: [{ scopeSpans: [] }, { scopeSpans: [{ spans: [] }] }],
  });
  for (const input of [
    { resourceSpans: [{ scopeSpans: null }] },
    { resourceSpans: [{ scopeSpans: [{ spans: null }] }] },
    { resourceSpans: [{ scopeSpans: [{ spans: {} }] }] },
  ])
    expect(() => validateOtelUpload(input)).toThrow();
});
