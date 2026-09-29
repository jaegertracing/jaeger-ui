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
import capture from './v3-trace-output.json';

type ParsedTrace = ReturnType<typeof GetTraceResponseSchema.parse>;

// Spans are located by name, not by position: nothing in OTLP or the v3 API
// fixes the order of a scope's spans, and this capture comes from a real server.
function spanNamed(parsed: ParsedTrace, name: string) {
  const spans = parsed.result.resourceSpans![0].scopeSpans![0].spans!;
  const found = spans.find(s => s.name === name);
  if (!found) {
    throw new Error(`the capture has no span named "${name}"`);
  }
  return found;
}

describe('GetTrace wire contract', () => {
  let parsed: ParsedTrace;

  beforeEach(() => {
    parsed = GetTraceResponseSchema.parse(capture);
  });

  it('accepts the captured v3 trace envelope', () => {
    expect(parsed.result.resourceSpans).toHaveLength(1);
    expect(parsed.result.resourceSpans![0].scopeSpans![0].spans).toHaveLength(3);
    const root = spanNamed(parsed, 'root-with-any-values');
    expect(root.traceId).toBe('0123456789abcdef0123456789abcdef');
    expect(root.spanId).toBe('0123456789abcdef');
  });

  it('preserves falsy AnyValues: empty string, false, zero, max int64', () => {
    const attrs = spanNamed(parsed, 'root-with-any-values').attributes!;
    const byKey = Object.fromEntries(attrs.map(a => [a.key, a.value])) as Record<string, any>;
    expect(byKey.empty.stringValue).toBe('');
    expect(byKey.false.boolValue).toBe(false);
    expect(byKey.integer.intValue).toBe('0');
    expect(byKey.array.arrayValue.values[1].boolValue).toBe(false);
    expect(byKey.array.arrayValue.values[2].intValue).toBe('9223372036854775807');
  });

  it('preserves nested kvlist and arrays inside AnyValue', () => {
    const nested = spanNamed(parsed, 'root-with-any-values').attributes!.find(a => a.key === 'nested')!;
    expect(nested.value.kvlistValue!.values![0].key).toBe('child');
  });

  it('accepts omitted kind (defaults to UNSPECIFIED) and empty status {}', () => {
    const unset = spanNamed(parsed, 'unset-kind-and-status');
    expect(unset.kind).toBeUndefined();
    expect(unset.status).toEqual({});
  });

  it('accepts numeric kind and status.code when present', () => {
    const numeric = spanNamed(parsed, 'numeric-kind-and-status');
    expect(numeric.kind).toBe(2);
    expect(numeric.status!.code).toBe(1);
  });

  it('BigInt can parse 64-bit timestamps without precision loss', () => {
    const s = spanNamed(parsed, 'root-with-any-values');
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
    const bad = JSON.parse(JSON.stringify(capture));
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
    const tracesData = capture.result;
    expect(() => refinedTracesData.parse(tracesData)).not.toThrow();
    expect(() => refinedTracesData.parse({ resourceSpans: [] })).not.toThrow();
  });

  it('silently ignores unknown fields (OTLP-JSON forward compatibility)', () => {
    const future = JSON.parse(JSON.stringify(capture));
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
