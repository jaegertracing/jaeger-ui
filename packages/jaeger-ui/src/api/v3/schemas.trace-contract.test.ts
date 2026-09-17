// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import {
  GetTraceResponseSchema,
  refinedSpan,
  refinedTracesData,
  refinedAnyValue,
  decimalNanoString,
  traceIdHex,
  spanIdHex,
} from './schemas';

const validEnvelope = {
  result: {
    resourceSpans: [
      {
        resource: { attributes: [{ key: 'service.name', value: { stringValue: 'lfx-wire-probe' } }] },
        scopeSpans: [
          {
            scope: { name: 'lfx-proposal', version: '1.0.0' },
            spans: [
              {
                traceId: '0123456789abcdef0123456789abcdef',
                spanId: '0123456789abcdef',
                name: 'root-with-any-values',
                startTimeUnixNano: '1786934400000000000',
                endTimeUnixNano: '1786934400001000000',
                attributes: [
                  {
                    key: 'array',
                    value: {
                      arrayValue: {
                        values: [
                          { stringValue: 'first' },
                          { boolValue: false },
                          { intValue: '9223372036854775807' },
                        ],
                      },
                    },
                  },
                  { key: 'bytes', value: { bytesValue: 'AQID' } },
                  { key: 'empty', value: { stringValue: '' } },
                  { key: 'false', value: { boolValue: false } },
                  { key: 'float', value: { doubleValue: 1.5 } },
                  { key: 'integer', value: { intValue: '0' } },
                  {
                    key: 'nested',
                    value: {
                      kvlistValue: {
                        values: [
                          { key: 'child', value: { arrayValue: { values: [{ stringValue: 'value' }] } } },
                        ],
                      },
                    },
                  },
                ],
                events: [
                  {
                    timeUnixNano: '1786934400000500000',
                    name: 'retry',
                    attributes: [{ key: 'attempt', value: { intValue: '1' } }],
                  },
                ],
                links: [
                  {
                    traceId: 'fedcba9876543210fedcba9876543210',
                    spanId: 'fedcba9876543210',
                    traceState: 'vendor=example',
                    flags: 1,
                  },
                ],
                status: { message: 'probe error status', code: 2 },
              },
              {
                traceId: '0123456789abcdef0123456789abcdef',
                spanId: '1111111111111111',
                parentSpanId: '0123456789abcdef',
                name: 'unset-kind-and-status',
                startTimeUnixNano: '1786934400000100000',
                endTimeUnixNano: '1786934400000200000',
                status: {},
              },
              {
                traceId: '0123456789abcdef0123456789abcdef',
                spanId: '2222222222222222',
                parentSpanId: '0123456789abcdef',
                name: 'numeric-kind-and-status',
                kind: 2,
                startTimeUnixNano: '1786934400000200000',
                endTimeUnixNano: '1786934400000300000',
                status: { code: 1 },
              },
            ],
          },
        ],
      },
    ],
  },
} as const;

describe('GetTrace wire contract', () => {
  it('accepts the captured v3-trace-local-2.13.0 envelope', () => {
    const parsed = GetTraceResponseSchema.parse(validEnvelope);
    expect(parsed.result.resourceSpans).toHaveLength(1);
    expect(parsed.result.resourceSpans![0].scopeSpans![0].spans).toHaveLength(3);
  });

  it('preserves falsy AnyValues: empty string, false, zero, max int64', () => {
    const parsed = GetTraceResponseSchema.parse(validEnvelope);
    const attrs = parsed.result.resourceSpans![0].scopeSpans![0].spans![0].attributes!;
    const byKey = Object.fromEntries(attrs.map(a => [a.key, a.value])) as Record<string, any>;
    expect(byKey.empty.stringValue).toBe('');
    expect(byKey.false.boolValue).toBe(false);
    expect(byKey.integer.intValue).toBe('0');
    expect(byKey.array.arrayValue.values[1].boolValue).toBe(false);
    expect(byKey.array.arrayValue.values[2].intValue).toBe('9223372036854775807');
  });

  it('preserves nested kvlist and arrays inside AnyValue', () => {
    const parsed = GetTraceResponseSchema.parse(validEnvelope);
    const nested = parsed.result.resourceSpans![0].scopeSpans![0].spans![0].attributes!.find(
      a => a.key === 'nested'
    )!;
    expect(nested.value.kvlistValue!.values![0].key).toBe('child');
  });

  it('accepts omitted kind (defaults to UNSPECIFIED) and empty status {}', () => {
    const parsed = GetTraceResponseSchema.parse(validEnvelope);
    const unset = parsed.result.resourceSpans![0].scopeSpans![0].spans![1];
    expect(unset.kind).toBeUndefined();
    expect(unset.status).toEqual({});
  });

  it('accepts numeric kind and status.code when present', () => {
    const parsed = GetTraceResponseSchema.parse(validEnvelope);
    const numeric = parsed.result.resourceSpans![0].scopeSpans![0].spans![2];
    expect(numeric.kind).toBe(2);
    expect(numeric.status!.code).toBe(1);
  });

  it('BigInt can parse 64-bit timestamps without precision loss', () => {
    const parsed = GetTraceResponseSchema.parse(validEnvelope);
    const s = parsed.result.resourceSpans![0].scopeSpans![0].spans![0];
    const dur = BigInt(s.endTimeUnixNano!) - BigInt(s.startTimeUnixNano!);
    expect(dur).toBe(1_000_000n);
    // Never use Number for 64-bit wire values
    expect(s.startTimeUnixNano).toBe('1786934400000000000');
  });

  it('rejects envelope missing result', () => {
    expect(() => GetTraceResponseSchema.parse({ resourceSpans: [] })).toThrow(z.ZodError);
    expect(() => GetTraceResponseSchema.parse({})).toThrow(z.ZodError);
  });

  it('rejects base64/non-hex trace/span IDs', () => {
    const bad = JSON.parse(JSON.stringify(validEnvelope));
    bad.result.resourceSpans[0].scopeSpans[0].spans[0].traceId = 'AQIDBAUG';
    expect(() => GetTraceResponseSchema.parse(bad)).toThrow(z.ZodError);
    bad.result.resourceSpans[0].scopeSpans[0].spans[0].traceId = '0123456789abcdef0123456789abcdef';
    bad.result.resourceSpans[0].scopeSpans[0].spans[0].spanId = 'zzz';
    expect(() => GetTraceResponseSchema.parse(bad)).toThrow(z.ZodError);
  });

  it('rejects non-decimal or numeric timestamps', () => {
    expect(() => decimalNanoString.parse('not-a-number')).toThrow(z.ZodError);
    expect(() => decimalNanoString.parse('')).toThrow(z.ZodError);
    // Numeric (non-string) must fail — proto3 JSON encodes int64 as quoted string
    expect(() =>
      refinedSpan.parse({
        traceId: '0123456789abcdef0123456789abcdef',
        spanId: '0123456789abcdef',
        startTimeUnixNano: 12345 as any,
      })
    ).toThrow(z.ZodError);
    expect(() =>
      refinedSpan.parse({
        traceId: '0123456789abcdef0123456789abcdef',
        spanId: '0123456789abcdef',
        startTimeUnixNano: '12.34',
      })
    ).toThrow(z.ZodError);
  });

  it('accepts future out-of-range kind/status enums (OTLP forward compatibility)', () => {
    // OTLP sends enums as numbers precisely so new values don't break old receivers.
    expect(() =>
      refinedSpan.parse({
        traceId: '0123456789abcdef0123456789abcdef',
        spanId: '0123456789abcdef',
        kind: 99 as any,
      })
    ).not.toThrow();
    expect(() =>
      refinedSpan.parse({
        traceId: '0123456789abcdef0123456789abcdef',
        spanId: '0123456789abcdef',
        status: { code: 99 as any },
      })
    ).not.toThrow();
    // Negative values are still rejected.
    expect(() =>
      refinedSpan.parse({
        traceId: '0123456789abcdef0123456789abcdef',
        spanId: '0123456789abcdef',
        kind: -1 as any,
      })
    ).toThrow(z.ZodError);
  });

  it('validates link IDs as hex and rejects non-hex', () => {
    expect(() =>
      GetTraceResponseSchema.parse({
        result: {
          resourceSpans: [
            {
              scopeSpans: [
                {
                  spans: [
                    {
                      traceId: '0123456789abcdef0123456789abcdef',
                      spanId: '0123456789abcdef',
                      links: [{ traceId: 'NOT_HEX', spanId: '0123456789abcdef' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      })
    ).toThrow(z.ZodError);
  });

  it('keeps envelope handling separable from TracesData', () => {
    // TracesData without envelope should also validate (for future streaming)
    const tracesData = (validEnvelope as any).result;
    expect(() => refinedTracesData.parse(tracesData)).not.toThrow();
    expect(() => refinedTracesData.parse({ resourceSpans: [] })).not.toThrow();
  });

  it('silently ignores unknown fields (OTLP-JSON forward compatibility)', () => {
    const future = JSON.parse(JSON.stringify(validEnvelope));
    future.futureTopLevelField = 'x';
    future.result.resourceSpans[0].scopeSpans[0].spans[0].someFutureSpanField = { nested: true };
    future.result.resourceSpans[0].scopeSpans[0].spans[0].status.unknownStatusField = 1;
    const parsed = GetTraceResponseSchema.parse(future);
    expect(parsed.result.resourceSpans).toHaveLength(1);
    expect(parsed.futureTopLevelField).toBe('x');
  });
});

describe('AnyValue recursive one-of', () => {
  it('accepts each value kind including falsy values', () => {
    expect(() => refinedAnyValue.parse({ stringValue: '' })).not.toThrow();
    expect(() => refinedAnyValue.parse({ boolValue: false })).not.toThrow();
    expect(() => refinedAnyValue.parse({ intValue: '0' })).not.toThrow();
    expect(() => refinedAnyValue.parse({ intValue: '-9223372036854775808' })).not.toThrow();
    expect(() => refinedAnyValue.parse({ doubleValue: 0 })).not.toThrow();
    expect(() => refinedAnyValue.parse({ bytesValue: 'AQID' })).not.toThrow();
    expect(() => refinedAnyValue.parse({ arrayValue: { values: [{ stringValue: 'x' }] } })).not.toThrow();
    expect(() =>
      refinedAnyValue.parse({ kvlistValue: { values: [{ key: 'k', value: { stringValue: 'v' } }] } })
    ).not.toThrow();
  });

  it('rejects empty object (no value field)', () => {
    expect(() => refinedAnyValue.parse({})).toThrow(z.ZodError);
  });

  it('rejects multiple value fields', () => {
    expect(() => refinedAnyValue.parse({ stringValue: 'x', boolValue: false } as any)).toThrow(z.ZodError);
    expect(() => refinedAnyValue.parse({ intValue: '1', doubleValue: 1.0 } as any)).toThrow(z.ZodError);
  });

  it('rejects non-decimal intValue', () => {
    expect(() => refinedAnyValue.parse({ intValue: '12.34' })).toThrow(z.ZodError);
    expect(() => refinedAnyValue.parse({ intValue: 'abc' })).toThrow(z.ZodError);
  });

  it('validates nested recursive structures', () => {
    const nested = {
      kvlistValue: {
        values: [{ key: 'child', value: { arrayValue: { values: [{ stringValue: 'value' }] } } }],
      },
    };
    expect(() => refinedAnyValue.parse(nested)).not.toThrow();
    const badNested = { kvlistValue: { values: [{ key: 'child', value: {} as any }] } };
    expect(() => refinedAnyValue.parse(badNested)).toThrow(z.ZodError);
  });

  it('rejects hex IDs interpreted as base64 (format: bytes confusion)', () => {
    expect(() => traceIdHex.parse('AQIDBAUG')).toThrow(z.ZodError);
    expect(() => spanIdHex.parse('AQIDBAUG')).toThrow(z.ZodError);
  });

  it('rejects all-zero IDs (reserved as invalid by OTLP)', () => {
    expect(() => traceIdHex.parse('0'.repeat(32))).toThrow(z.ZodError);
    expect(() => spanIdHex.parse('0'.repeat(16))).toThrow(z.ZodError);
    expect(() => refinedSpan.parse({ traceId: '0'.repeat(32), spanId: '0123456789abcdef' })).toThrow(
      z.ZodError
    );
  });

  it('rejects timestamps outside uint64 range', () => {
    expect(() => decimalNanoString.parse('18446744073709551616')).toThrow(z.ZodError);
    expect(() => decimalNanoString.parse('9'.repeat(30))).toThrow(z.ZodError);
    expect(() => decimalNanoString.parse('18446744073709551615')).not.toThrow();
  });

  it('rejects intValue outside int64 range', () => {
    expect(() => refinedAnyValue.parse({ intValue: '9223372036854775808' })).toThrow(z.ZodError);
    expect(() => refinedAnyValue.parse({ intValue: '-9223372036854775809' })).toThrow(z.ZodError);
    expect(() => refinedAnyValue.parse({ intValue: '9223372036854775807' })).not.toThrow();
    expect(() => refinedAnyValue.parse({ intValue: '-9223372036854775808' })).not.toThrow();
  });

  it('rejects malformed base64 bytesValue', () => {
    expect(() => refinedAnyValue.parse({ bytesValue: '%%%' })).toThrow(z.ZodError);
    expect(() => refinedAnyValue.parse({ bytesValue: 'AQID' })).not.toThrow();
  });
});
