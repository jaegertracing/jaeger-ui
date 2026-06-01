// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import {
  ServicesResponseSchema,
  OperationsResponseSchema,
  OperationSchema,
  TraceIdSchema,
  SpanIdSchema,
  TimestampSchema,
  AnyValueSchema,
  KeyValueSchema,
  StatusSchema,
  SpanSchema,
  TracesDataSchema,
} from './schemas';

describe('ServicesResponseSchema', () => {
  it('validates correct structure', () => {
    const data = { services: ['service-a', 'service-b'] };
    const result = ServicesResponseSchema.parse(data);
    expect(result.services).toEqual(['service-a', 'service-b']);
  });

  it('rejects missing services field', () => {
    const data = {};
    expect(() => ServicesResponseSchema.parse(data)).toThrow(z.ZodError);
  });
});

describe('OperationSchema', () => {
  it('validates correct operation structure', () => {
    const data = { name: 'GET /api/users', spanKind: 'SPAN_KIND_CLIENT' };
    const result = OperationSchema.parse(data);
    expect(result.name).toBe('GET /api/users');
    expect(result.spanKind).toBe('SPAN_KIND_CLIENT');
  });
});

describe('ID and Timestamp Validators', () => {
  describe('TraceIdSchema', () => {
    it('accepts valid 32-char hex trace ID', () => {
      const id = '0102030405060708090a0b0c0d0e0f10';
      expect(TraceIdSchema.parse(id)).toBe(id);
    });

    it('rejects invalid trace IDs', () => {
      expect(() => TraceIdSchema.parse('invalid')).toThrow('Invalid trace ID');
      expect(() => TraceIdSchema.parse('0102030405060708090a0b0c0d0e0fXX')).toThrow('Invalid trace ID');
    });
  });

  describe('SpanIdSchema', () => {
    it('accepts valid 16-char hex span ID', () => {
      const id = '0102030405060708';
      expect(SpanIdSchema.parse(id)).toBe(id);
    });

    it('rejects invalid span IDs', () => {
      expect(() => SpanIdSchema.parse('invalid')).toThrow('Invalid span ID');
    });
  });

  describe('TimestampSchema', () => {
    it('accepts numeric string', () => {
      const ts = '1234567890123456789';
      expect(TimestampSchema.parse(ts)).toBe(ts);
    });

    it('rejects non-numeric string', () => {
      expect(() => TimestampSchema.parse('not-a-timestamp')).toThrow('Invalid timestamp');
    });
  });
});

describe('AnyValueSchema', () => {
  it('validates stringValue', () => {
    const data = { stringValue: 'test' };
    expect(AnyValueSchema.parse(data)).toEqual(data);
  });

  it('validates boolValue', () => {
    const data = { boolValue: true };
    expect(AnyValueSchema.parse(data)).toEqual(data);
  });

  it('validates intValue', () => {
    const data = { intValue: '123' };
    expect(AnyValueSchema.parse(data)).toEqual(data);
  });

  it('validates doubleValue', () => {
    const data = { doubleValue: 123.45 };
    expect(AnyValueSchema.parse(data)).toEqual(data);
  });

  it('validates nested arrayValue', () => {
    const data = {
      arrayValue: {
        values: [{ stringValue: 'a' }, { boolValue: true }],
      },
    };
    expect(AnyValueSchema.parse(data)).toEqual(data);
  });

  it('validates nested kvlistValue', () => {
    const data = {
      kvlistValue: {
        values: [
          { key: 'foo', value: { stringValue: 'bar' } },
          { key: 'baz', value: { boolValue: false } },
        ],
      },
    };
    expect(AnyValueSchema.parse(data)).toEqual(data);
  });

  it('allows unknown fields via passthrough', () => {
    const data = { stringValue: 'test', extra: 'field' };
    expect(AnyValueSchema.parse(data)).toEqual(data);
  });
});

describe('KeyValueSchema', () => {
  it('validates correct structure', () => {
    const data = { key: 'http.method', value: { stringValue: 'GET' } };
    expect(KeyValueSchema.parse(data)).toEqual(data);
  });

  it('rejects missing key', () => {
    const data = { value: { stringValue: 'GET' } };
    expect(() => KeyValueSchema.parse(data)).toThrow(z.ZodError);
  });
});

describe('StatusSchema', () => {
  it('validates correct structure', () => {
    const data = { code: 1, message: 'some error' };
    expect(StatusSchema.parse(data)).toEqual(data);
  });

  it('validates minimal structure', () => {
    const data = { code: 0 };
    expect(StatusSchema.parse(data)).toEqual(data);
  });
});

describe('SpanSchema', () => {
  const validSpan = {
    traceId: '0102030405060708090a0b0c0d0e0f10',
    spanId: '0102030405060708',
    name: 'test-span',
    kind: 2,
    startTimeUnixNano: '1234567890',
    endTimeUnixNano: '1234567891',
    attributes: [{ key: 'attr1', value: { stringValue: 'val1' } }],
  };

  it('validates correct span structure', () => {
    expect(SpanSchema.parse(validSpan)).toEqual(validSpan);
  });

  it('rejects span with invalid traceId', () => {
    const invalid = { ...validSpan, traceId: 'too-short' };
    expect(() => SpanSchema.parse(invalid)).toThrow('Invalid trace ID');
  });

  it('validates span with optional fields and passthrough', () => {
    const complexSpan = {
      ...validSpan,
      parentSpanId: '1234567890abcdef',
      events: [
        {
          timeUnixNano: '1234567892',
          name: 'event1',
          attributes: [],
          extra: 'allowed',
        },
      ],
      status: { code: 0 },
    };
    expect(SpanSchema.parse(complexSpan)).toEqual(complexSpan);
  });
});

describe('TracesDataSchema', () => {
  it('validates complex trace data structure', () => {
    const data = {
      resourceSpans: [
        {
          resource: { attributes: [] },
          scopeSpans: [
            {
              scope: { name: 'test-scope', version: '1.0' },
              spans: [
                {
                  traceId: '0102030405060708090a0b0c0d0e0f10',
                  spanId: '0102030405060708',
                  name: 'span1',
                  kind: 1,
                  startTimeUnixNano: '1',
                  endTimeUnixNano: '2',
                  attributes: [],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(TracesDataSchema.parse(data)).toEqual(data);
  });

  it('rejects malformed traces data envelope', () => {
    const data = { resourceSpans: 'not-an-array' };
    expect(() => TracesDataSchema.parse(data)).toThrow(z.ZodError);
  });
});
