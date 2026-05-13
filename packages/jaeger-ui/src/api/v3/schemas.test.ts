// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import {
  ServicesResponseSchema,
  OperationsResponseSchema,
  OperationSchema,
  TracesDataSchema,
  ResourceSpansSchema,
  ScopeSpansSchema,
  SpanSchema,
  SpanEventSchema,
  SpanLinkSchema,
  ResourceSchema,
  InstrumentationScopeSchema,
  KeyValueSchema,
  AnyValueSchema,
  ArrayValueSchema,
  KeyValueListSchema,
  StatusSchema,
  traceIdHex,
  spanIdHex,
} from './schemas';

describe('ServicesResponseSchema', () => {
  it('validates correct structure', () => {
    const data = { services: ['service-a', 'service-b'] };
    const result = ServicesResponseSchema.parse(data);
    expect(result.services).toEqual(['service-a', 'service-b']);
  });

  it('validates empty services array', () => {
    const data = { services: [] };
    const result = ServicesResponseSchema.parse(data);
    expect(result.services).toEqual([]);
  });

  it('rejects missing services field', () => {
    const data = {};
    expect(() => ServicesResponseSchema.parse(data)).toThrow(z.ZodError);
  });

  it('rejects non-array services field', () => {
    const data = { services: 'not-an-array' };
    expect(() => ServicesResponseSchema.parse(data)).toThrow(z.ZodError);
  });

  it('rejects non-string elements in services array', () => {
    const data = { services: ['valid', 123, 'valid-again'] };
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

  it('rejects missing name field', () => {
    const data = { spanKind: 'SPAN_KIND_CLIENT' };
    expect(() => OperationSchema.parse(data)).toThrow(z.ZodError);
  });

  it('rejects missing spanKind field', () => {
    const data = { name: 'GET /api/users' };
    expect(() => OperationSchema.parse(data)).toThrow(z.ZodError);
  });
});

describe('OperationsResponseSchema', () => {
  it('validates correct structure', () => {
    const data = {
      operations: [
        { name: 'GET /api/users', spanKind: 'SPAN_KIND_CLIENT' },
        { name: 'POST /api/users', spanKind: 'SPAN_KIND_SERVER' },
      ],
    };
    const result = OperationsResponseSchema.parse(data);
    expect(result.operations).toHaveLength(2);
    expect(result.operations[0].name).toBe('GET /api/users');
  });

  it('validates empty operations array', () => {
    const data = { operations: [] };
    const result = OperationsResponseSchema.parse(data);
    expect(result.operations).toEqual([]);
  });

  it('rejects missing operations field', () => {
    const data = {};
    expect(() => OperationsResponseSchema.parse(data)).toThrow(z.ZodError);
  });

  it('rejects non-array operations field', () => {
    const data = { operations: 'not-an-array' };
    expect(() => OperationsResponseSchema.parse(data)).toThrow(z.ZodError);
  });

  it('rejects invalid operation objects', () => {
    const data = {
      operations: [{ name: 'valid', spanKind: 'valid' }, { name: 'invalid' }],
    };
    expect(() => OperationsResponseSchema.parse(data)).toThrow(z.ZodError);
  });
});

describe('ID Validators', () => {
  describe('traceIdHex', () => {
    it('accepts valid 32-char lowercase hex trace ID', () => {
      const id = '0102030405060708090a0b0c0d0e0f10';
      expect(traceIdHex.parse(id)).toBe(id);
    });

    it('accepts valid 32-char uppercase hex trace ID', () => {
      const id = '0102030405060708090A0B0C0D0E0F10';
      expect(traceIdHex.parse(id)).toBe(id);
    });

    it('accepts valid 32-char mixed case hex trace ID', () => {
      const id = '0102030405060708090a0B0C0d0E0F10';
      expect(traceIdHex.parse(id)).toBe(id);
    });

    it('rejects trace ID with invalid characters', () => {
      expect(() => traceIdHex.parse('0102030405060708090a0b0c0d0e0fXX')).toThrow(
        'must be 32-char hex string'
      );
    });

    it('rejects trace ID with wrong length (too short)', () => {
      expect(() => traceIdHex.parse('0102030405060708090a0b0c0d0e0f')).toThrow('must be 32-char hex string');
    });

    it('rejects trace ID with wrong length (too long)', () => {
      expect(() => traceIdHex.parse('0102030405060708090a0b0c0d0e0f1011')).toThrow(
        'must be 32-char hex string'
      );
    });

    it('rejects base64-encoded trace ID', () => {
      expect(() => traceIdHex.parse('AQIDBAUG')).toThrow('must be 32-char hex string');
    });

    it('rejects empty string', () => {
      expect(() => traceIdHex.parse('')).toThrow('must be 32-char hex string');
    });
  });

  describe('spanIdHex', () => {
    it('accepts valid 16-char lowercase hex span ID', () => {
      const id = '0102030405060708';
      expect(spanIdHex.parse(id)).toBe(id);
    });

    it('accepts valid 16-char uppercase hex span ID', () => {
      const id = '0102030405060708';
      expect(spanIdHex.parse(id)).toBe(id);
    });

    it('rejects span ID with invalid characters', () => {
      expect(() => spanIdHex.parse('010203040506070X')).toThrow('must be 16-char hex string');
    });

    it('rejects span ID with wrong length (too short)', () => {
      expect(() => spanIdHex.parse('01020304050607')).toThrow('must be 16-char hex string');
    });

    it('rejects span ID with wrong length (too long)', () => {
      expect(() => spanIdHex.parse('01020304050607081')).toThrow('must be 16-char hex string');
    });

    it('rejects empty string', () => {
      expect(() => spanIdHex.parse('')).toThrow('must be 16-char hex string');
    });
  });
});

// Minimal-but-valid OTLP wire objects used as building blocks below.
// Each helper returns an object satisfying every required field of the
// corresponding schema; tests then either pass it through or perturb a
// single field to exercise a rejection path.
const minimalStatus = () => ({ code: 0, message: '', details: [] });
const minimalResource = () => ({ attributes: [], droppedAttributesCount: 0 });
const minimalScope = () => ({
  name: '@opentelemetry/instrumentation-http',
  version: '0.45.0',
  attributes: [],
  droppedAttributesCount: 0,
});
const minimalSpan = () => ({
  traceId: '0102030405060708090a0b0c0d0e0f10',
  spanId: '0102030405060708',
  traceState: '',
  parentSpanId: '',
  flags: 0,
  name: 'HTTP GET',
  kind: 2,
  startTimeUnixNano: '1700000000000000000',
  endTimeUnixNano: '1700000000000001000',
  attributes: [],
  droppedAttributesCount: 0,
  events: [],
  droppedEventsCount: 0,
  links: [],
  droppedLinksCount: 0,
  status: minimalStatus(),
});

describe('StatusSchema', () => {
  it('validates a minimal status', () => {
    expect(StatusSchema.parse(minimalStatus())).toEqual(minimalStatus());
  });

  it('rejects missing code', () => {
    const { code, ...rest } = minimalStatus();
    void code;
    expect(() => StatusSchema.parse(rest)).toThrow(z.ZodError);
  });
});

describe('ResourceSchema', () => {
  it('validates a minimal resource', () => {
    const r = minimalResource();
    expect(ResourceSchema.parse(r)).toEqual(r);
  });

  it('rejects missing droppedAttributesCount', () => {
    expect(() => ResourceSchema.parse({ attributes: [] })).toThrow(z.ZodError);
  });
});

describe('InstrumentationScopeSchema', () => {
  it('validates a minimal scope', () => {
    const s = minimalScope();
    expect(InstrumentationScopeSchema.parse(s)).toEqual(s);
  });

  it('rejects missing name', () => {
    const { name, ...rest } = minimalScope();
    void name;
    expect(() => InstrumentationScopeSchema.parse(rest)).toThrow(z.ZodError);
  });
});

describe('SpanEventSchema', () => {
  it('validates a minimal event', () => {
    const event = {
      timeUnixNano: '1700000000000000000',
      name: 'exception',
      attributes: [],
      droppedAttributesCount: 0,
    };
    expect(SpanEventSchema.parse(event)).toEqual(event);
  });

  it('rejects missing timeUnixNano', () => {
    expect(() => SpanEventSchema.parse({ name: 'x', attributes: [], droppedAttributesCount: 0 })).toThrow(
      z.ZodError
    );
  });
});

describe('SpanLinkSchema', () => {
  it('validates a minimal link', () => {
    const link = {
      traceId: '0102030405060708090a0b0c0d0e0f10',
      spanId: '0102030405060708',
      traceState: '',
      attributes: [],
      droppedAttributesCount: 0,
      flags: 0,
    };
    expect(SpanLinkSchema.parse(link)).toEqual(link);
  });

  it('rejects missing spanId', () => {
    const link = {
      traceId: '0102030405060708090a0b0c0d0e0f10',
      traceState: '',
      attributes: [],
      droppedAttributesCount: 0,
      flags: 0,
    };
    expect(() => SpanLinkSchema.parse(link)).toThrow(z.ZodError);
  });
});

describe('SpanSchema', () => {
  it('validates a minimal span', () => {
    const span = minimalSpan();
    expect(SpanSchema.parse(span)).toEqual(span);
  });

  it('rejects missing traceId', () => {
    const { traceId, ...rest } = minimalSpan();
    void traceId;
    expect(() => SpanSchema.parse(rest)).toThrow(z.ZodError);
  });

  it('rejects missing status', () => {
    const { status, ...rest } = minimalSpan();
    void status;
    expect(() => SpanSchema.parse(rest)).toThrow(z.ZodError);
  });

  it('validates a span with events and links populated', () => {
    const span = {
      ...minimalSpan(),
      events: [
        { timeUnixNano: '1700000000000000000', name: 'log', attributes: [], droppedAttributesCount: 0 },
      ],
      links: [
        {
          traceId: 'aa02030405060708090a0b0c0d0e0f10',
          spanId: 'aa02030405060708',
          traceState: '',
          attributes: [],
          droppedAttributesCount: 0,
          flags: 0,
        },
      ],
    };
    const parsed = SpanSchema.parse(span);
    expect(parsed.events).toHaveLength(1);
    expect(parsed.links).toHaveLength(1);
  });
});

describe('AnyValueSchema (recursive)', () => {
  it('validates a scalar stringValue', () => {
    const v = { stringValue: 'hello' };
    expect(AnyValueSchema.parse(v)).toEqual(v);
  });

  it('validates a nested kvlistValue containing AnyValue children', () => {
    const v = {
      kvlistValue: {
        values: [
          { key: 'inner.key', value: { stringValue: 'inner-string' } },
          { key: 'inner.bool', value: { boolValue: true } },
        ],
      },
    };
    expect(AnyValueSchema.parse(v)).toEqual(v);
  });

  it('validates a deeply nested arrayValue of arrayValue', () => {
    const v = {
      arrayValue: {
        values: [{ arrayValue: { values: [{ stringValue: 'leaf' }] } }, { intValue: '42' }],
      },
    };
    expect(AnyValueSchema.parse(v)).toEqual(v);
  });

  it('passes through (does not reject) unknown extra keys per .passthrough()', () => {
    // Forward-compatibility: schemas use .passthrough() so future OTLP additions
    // do not break validation. This test pins that behavior.
    const v = { stringValue: 'hello', someFutureField: 123 };
    expect(AnyValueSchema.parse(v)).toEqual(v);
  });
});

describe('KeyValueSchema', () => {
  it('validates a KeyValue with an AnyValue payload', () => {
    const kv = { key: 'service.name', value: { stringValue: 'frontend' } };
    expect(KeyValueSchema.parse(kv)).toEqual(kv);
  });

  it('validates a KeyValue whose value is itself an arrayValue', () => {
    const kv = {
      key: 'http.headers',
      value: {
        arrayValue: { values: [{ stringValue: 'a' }, { stringValue: 'b' }] },
      },
    };
    expect(KeyValueSchema.parse(kv)).toEqual(kv);
  });
});

describe('ArrayValueSchema', () => {
  it('validates an empty array', () => {
    const v = { values: [] };
    expect(ArrayValueSchema.parse(v)).toEqual(v);
  });

  it('validates an array of mixed scalar AnyValues', () => {
    const v = { values: [{ stringValue: 'x' }, { intValue: '1' }, { boolValue: false }] };
    expect(ArrayValueSchema.parse(v)).toEqual(v);
  });
});

describe('KeyValueListSchema', () => {
  it('validates an empty list', () => {
    const v = { values: [] };
    expect(KeyValueListSchema.parse(v)).toEqual(v);
  });

  it('validates a list with one KeyValue', () => {
    const v = { values: [{ key: 'a', value: { stringValue: 'b' } }] };
    expect(KeyValueListSchema.parse(v)).toEqual(v);
  });
});

describe('ScopeSpansSchema', () => {
  it('validates a minimal scopeSpans group', () => {
    const s = { scope: minimalScope(), spans: [], schemaUrl: '' };
    expect(ScopeSpansSchema.parse(s)).toEqual(s);
  });

  it('rejects missing scope', () => {
    expect(() => ScopeSpansSchema.parse({ spans: [], schemaUrl: '' })).toThrow(z.ZodError);
  });

  it('validates a scopeSpans group that contains a populated span', () => {
    const s = { scope: minimalScope(), spans: [minimalSpan()], schemaUrl: 'https://example/schema/1' };
    const parsed = ScopeSpansSchema.parse(s);
    expect(parsed.spans).toHaveLength(1);
    expect(parsed.spans[0].name).toBe('HTTP GET');
  });
});

describe('ResourceSpansSchema', () => {
  it('validates a minimal resourceSpans group', () => {
    const r = { resource: minimalResource(), scopeSpans: [], schemaUrl: '' };
    expect(ResourceSpansSchema.parse(r)).toEqual(r);
  });

  it('rejects missing resource', () => {
    expect(() => ResourceSpansSchema.parse({ scopeSpans: [], schemaUrl: '' })).toThrow(z.ZodError);
  });
});

describe('TracesDataSchema', () => {
  it('validates an empty TracesData envelope', () => {
    const t = { resourceSpans: [] };
    expect(TracesDataSchema.parse(t)).toEqual(t);
  });

  it('validates a fully populated TracesData with one span', () => {
    const t = {
      resourceSpans: [
        {
          resource: minimalResource(),
          scopeSpans: [{ scope: minimalScope(), spans: [minimalSpan()], schemaUrl: '' }],
          schemaUrl: '',
        },
      ],
    };
    const parsed = TracesDataSchema.parse(t);
    expect(parsed.resourceSpans[0].scopeSpans[0].spans[0].traceId).toBe('0102030405060708090a0b0c0d0e0f10');
  });

  it('rejects missing resourceSpans field', () => {
    expect(() => TracesDataSchema.parse({})).toThrow(z.ZodError);
  });
});
