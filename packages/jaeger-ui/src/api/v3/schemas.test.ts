// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod';
import otlpFixture from '../../utils/fixtures/otlp2jaeger-in.json';
import {
  ServicesResponseSchema,
  OperationsResponseSchema,
  OperationSchema,
  TraceSummariesResponseSchema,
  TracesDataSchema,
  AnyValueSchema,
  traceIdHex,
  spanIdHex,
  QualityMetricsSchema,
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

describe('TraceSummariesResponseSchema', () => {
  const fullSummary = {
    traceId: 'aaaabbbbccccdddd0000111122223333',
    rootServiceName: 'svc',
    rootOperationName: 'op',
    minStartTimeUnixNano: '1700000001000000000',
    maxEndTimeUnixNano: '1700000001000500000',
    spanCount: 5,
    errorSpanCount: 1,
    orphanSpanCount: 0,
    services: [{ name: 'svc', spanCount: 5, errorSpanCount: 1 }],
  };

  it('accepts a fully-populated summary with traceId (spec field name)', () => {
    const result = TraceSummariesResponseSchema.parse({ summaries: [fullSummary] });
    expect(result.summaries!).toHaveLength(1);
    expect(result.summaries![0].traceId).toBe(fullSummary.traceId);
  });

  it('accepts traceID (uppercase D) and normalizes it to traceId', () => {
    const { traceId, ...rest } = fullSummary;
    const withUpperD = { traceID: traceId, ...rest };
    const result = TraceSummariesResponseSchema.parse({ summaries: [withUpperD] });
    expect(result.summaries![0].traceId).toBe(traceId);
  });

  it('accepts a minimal summary with only traceId', () => {
    const minimal = { traceId: 'aaaabbbbccccdddd0000111122223333' };
    const result = TraceSummariesResponseSchema.parse({ summaries: [minimal] });
    expect(result.summaries![0].traceId).toBe(minimal.traceId);
    expect(result.summaries![0].spanCount).toBeUndefined();
    expect(result.summaries![0].minStartTimeUnixNano).toBeUndefined();
  });

  it('accepts a summary with timestamps present', () => {
    const withTimestamps = {
      traceId: 'aaaabbbbccccdddd0000111122223333',
      minStartTimeUnixNano: '1000000',
      maxEndTimeUnixNano: '2000000',
    };
    const result = TraceSummariesResponseSchema.parse({ summaries: [withTimestamps] });
    expect(result.summaries![0].minStartTimeUnixNano).toBe('1000000');
  });

  it('rejects a summary missing traceId', () => {
    const { traceId: _omit, ...noTraceId } = fullSummary;
    expect(() => TraceSummariesResponseSchema.parse({ summaries: [noTraceId] })).toThrow(z.ZodError);
  });

  it('rejects a traceId that is not a 32-char hex string', () => {
    expect(() =>
      TraceSummariesResponseSchema.parse({ summaries: [{ ...fullSummary, traceId: 'not-hex' }] })
    ).toThrow(z.ZodError);
  });

  it('rejects a non-decimal minStartTimeUnixNano when present', () => {
    expect(() =>
      TraceSummariesResponseSchema.parse({
        summaries: [{ ...fullSummary, minStartTimeUnixNano: 'not-a-number' }],
      })
    ).toThrow(z.ZodError);
  });

  it('rejects a numeric (non-string) minStartTimeUnixNano', () => {
    expect(() =>
      TraceSummariesResponseSchema.parse({ summaries: [{ ...fullSummary, minStartTimeUnixNano: 12345 }] })
    ).toThrow(z.ZodError);
  });

  it('accepts an empty summaries array', () => {
    const result = TraceSummariesResponseSchema.parse({ summaries: [] });
    expect(result.summaries).toEqual([]);
  });

  it('accepts response with no summaries field (treats as absent)', () => {
    const result = TraceSummariesResponseSchema.parse({});
    expect(result.summaries).toBeUndefined();
  });

  it('prefers traceId over traceID when both are present', () => {
    const both = { ...fullSummary, traceID: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' };
    const result = TraceSummariesResponseSchema.parse({ summaries: [both] });
    expect(result.summaries![0].traceId).toBe(fullSummary.traceId);
  });

  it('rejects negative spanCount', () => {
    expect(() =>
      TraceSummariesResponseSchema.parse({ summaries: [{ ...fullSummary, spanCount: -1 }] })
    ).toThrow(z.ZodError);
  });

  it('rejects negative errorSpanCount in services', () => {
    expect(() =>
      TraceSummariesResponseSchema.parse({
        summaries: [{ ...fullSummary, services: [{ name: 'svc', errorSpanCount: -1 }] }],
      })
    ).toThrow(z.ZodError);
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
      const id = '010203040506ABCD';
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

// Real-wire coverage for the OTLP re-exports above. Real payloads omit
// default-valued Proto3 JSON fields (empty `status: {}`, no traceState/flags,
// events, links, or dropped-count fields), so these pin properties a codegen
// bump could actually break rather than every field of the generated definitions.
describe('TracesDataSchema', () => {
  it('parses a real OTLP payload with sparse fields', () => {
    const parsed = TracesDataSchema.parse(otlpFixture);
    expect(parsed.resourceSpans).toHaveLength(1);
    const spans = parsed.resourceSpans![0]!.scopeSpans![0]!.spans!;
    expect(spans).toHaveLength(2);
    expect(spans[0]!.name).toBe('okey-dokey-0');
    // Empty status is UNSET on the wire, not a validation failure.
    expect(spans[0]!.status).toEqual({});
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

describe('QualityMetricsSchema', () => {
  it('validates minimal valid quality metrics response', () => {
    const minimal = {
      traceQualityDocumentationLink: 'https://example.com/docs',
      scores: [],
      metrics: [],
    };
    expect(QualityMetricsSchema.parse(minimal)).toEqual(minimal);
  });

  it('validates full quality metrics response with all fields', () => {
    const full = {
      traceQualityDocumentationLink: 'https://example.com/docs/quality',
      bannerText: {
        value: 'System notice',
        styling: { color: 'red', fontWeight: 'bold' },
      },
      scores: [
        {
          key: 'score-1',
          label: 'Trace Completeness',
          max: 100,
          value: 95,
        },
      ],
      metrics: [
        {
          name: 'Unique Span IDs',
          category: 'score-1',
          description: 'Spans in a trace must have distinct IDs',
          metricDocumentationLink: 'https://example.com/docs/unique-ids',
          metricWeight: 1.5,
          passCount: 95,
          passExamples: [{ traceID: '1234567890abcdef', spanIDs: ['span1', 'span2'] }],
          failureCount: 5,
          failureExamples: [{ traceID: 'fedcba0987654321' }],
          exemptionCount: 0,
          exemptionExamples: [],
          details: [
            {
              description: 'Duplicate span ID breakdown',
              header: 'Duplicates',
              columns: [{ key: 'spanID', label: 'Span ID', preventSort: true }],
              rows: [{ spanID: 'span1', count: 2 }],
            },
          ],
        },
      ],
      clients: [
        {
          version: '1.40.0',
          minVersion: '1.35.0',
          count: 42,
          examples: [{ traceID: 'abcdef1234567890' }],
        },
      ],
    };
    expect(QualityMetricsSchema.parse(full)).toEqual(full);
  });

  it('validates details with loose columns and rows', () => {
    const data = {
      traceQualityDocumentationLink: 'https://example.com/docs',
      scores: [],
      metrics: [
        {
          name: 'm1',
          category: 's1',
          description: 'd1',
          metricDocumentationLink: 'https://example.com',
          metricWeight: 1,
          passCount: 1,
          failureCount: 0,
          details: [
            {
              columns: [{ customCol: 'value', another: 123 }],
              rows: [{ customCol: 'data', arbitrary: true }],
            },
          ],
        },
      ],
    };
    expect(QualityMetricsSchema.parse(data)).toEqual(data);
  });

  it('validates details with string shorthand column definitions', () => {
    const data = {
      traceQualityDocumentationLink: 'https://example.com/docs',
      scores: [],
      metrics: [
        {
          name: 'm1',
          category: 's1',
          description: 'd1',
          metricDocumentationLink: 'https://example.com',
          metricWeight: 1,
          passCount: 1,
          failureCount: 0,
          details: [
            {
              columns: ['col0', 'col1'],
              rows: [{ col0: 'v0', col1: 'v1' }],
            },
          ],
        },
      ],
    };
    expect(QualityMetricsSchema.parse(data)).toEqual(data);
  });

  it('normalizes null optional values from built-in endpoint response to undefined', () => {
    const endpointResponse = {
      traceQualityDocumentationLink:
        'https://github.com/jaegertracing/jaeger-analytics-java#trace-quality-metrics',
      bannerText: {
        value: '🛑 Made up data, for demonstration only!',
        styling: {
          color: 'blue',
          fontWeight: 'bold',
        },
      },
      scores: [
        {
          key: 'coverage',
          label: 'Instrumentation Coverage',
          max: 100,
          value: 90,
        },
        {
          key: 'quality',
          label: 'Trace Quality',
          max: 100,
          value: 85,
        },
      ],
      metrics: [
        {
          name: 'Span Completeness',
          category: 'coverage',
          description: 'Measures the completeness of spans in traces.',
          metricDocumentationLink: 'https://example.com/span-completeness-docs',
          metricWeight: 0.6,
          passCount: 1500,
          passExamples: [
            { traceID: 'trace-id-001', spanIDs: null },
            { traceID: 'trace-id-002', spanIDs: null },
          ],
          failureCount: 100,
          failureExamples: [{ traceID: 'trace-id-003', spanIDs: null }],
          exemptionCount: null,
          exemptionExamples: null,
          details: [
            {
              description: 'Detailed breakdown of span completeness.',
              header: 'Span Completeness Details',
              columns: [
                { key: 'service', label: 'Service' },
                { key: 'spanCount', label: 'Span Count' },
              ],
              rows: [
                { service: 'sample-service-A', spanCount: 150 },
                { service: 'sample-service-B', spanCount: 200 },
              ],
            },
          ],
        },
        {
          name: 'Error Rate',
          category: 'quality',
          description: 'Percentage of spans that resulted in errors.',
          metricDocumentationLink: 'https://example.com/error-rate-docs',
          metricWeight: 0.4,
          passCount: 1400,
          passExamples: [{ traceID: 'trace-id-004', spanIDs: null }],
          failureCount: 80,
          failureExamples: [{ traceID: 'trace-id-005', spanIDs: null }],
          exemptionCount: null,
          exemptionExamples: null,
          details: [
            {
              description: 'Detailed breakdown of error rates.',
              header: 'Error Rate Details',
              columns: [
                { key: 'service', label: 'Service' },
                { key: 'errorCount', label: 'Error Count' },
              ],
              rows: [
                { service: 'sample-service-A', errorCount: 5 },
                { service: 'sample-service-B', errorCount: 3 },
              ],
            },
          ],
        },
      ],
      clients: [
        {
          version: '1.0.0',
          minVersion: '0.9.0',
          count: 10,
          examples: [{ traceID: 'trace-id-006', spanIDs: null }],
        },
      ],
    };

    const parsed = QualityMetricsSchema.parse(endpointResponse);
    expect(parsed.metrics[0].passExamples?.[0].spanIDs).toBeUndefined();
    expect(parsed.metrics[0].exemptionCount).toBeUndefined();
    expect(parsed.metrics[0].exemptionExamples).toBeUndefined();
    expect(parsed.clients?.[0].examples[0].spanIDs).toBeUndefined();
    expect(parsed.scores).toHaveLength(2);
    expect(parsed.metrics).toHaveLength(2);
  });

  it('normalizes null details from the Go Details slice to undefined', () => {
    const parsed = QualityMetricsSchema.parse({
      traceQualityDocumentationLink: 'https://example.com/docs',
      scores: [],
      metrics: [
        {
          name: 'm1',
          category: 's1',
          description: 'd1',
          metricDocumentationLink: 'https://example.com',
          metricWeight: 1,
          passCount: 1,
          failureCount: 0,
          details: null,
        },
      ],
    });
    expect(parsed.metrics[0].details).toBeUndefined();
  });

  it('validates bannerText as plain string', () => {
    const data = {
      traceQualityDocumentationLink: 'https://example.com/docs',
      bannerText: 'Plain text banner',
      scores: [],
      metrics: [],
    };
    expect(QualityMetricsSchema.parse(data)).toEqual(data);
  });

  it('passes through unknown extra properties on root and nested objects', () => {
    const data = {
      traceQualityDocumentationLink: 'https://example.com/docs',
      scores: [{ key: 's1', label: 'S1', max: 10, value: 8, customScoreMeta: 'extra' }],
      metrics: [
        {
          name: 'm1',
          category: 's1',
          description: 'd1',
          metricDocumentationLink: 'https://example.com',
          metricWeight: 1,
          passCount: 10,
          failureCount: 0,
          futureMetricAttr: { flag: true },
        },
      ],
      customServerTag: 'experimental',
    };
    expect(QualityMetricsSchema.parse(data)).toEqual(data);
  });

  it('rejects missing traceQualityDocumentationLink', () => {
    const data = {
      scores: [],
      metrics: [],
    };
    expect(() => QualityMetricsSchema.parse(data)).toThrow(z.ZodError);
  });

  it('rejects missing or non-array scores', () => {
    expect(() =>
      QualityMetricsSchema.parse({
        traceQualityDocumentationLink: 'https://example.com',
        metrics: [],
      })
    ).toThrow(z.ZodError);

    expect(() =>
      QualityMetricsSchema.parse({
        traceQualityDocumentationLink: 'https://example.com',
        scores: 'invalid',
        metrics: [],
      })
    ).toThrow(z.ZodError);
  });

  it('rejects invalid score object', () => {
    expect(() =>
      QualityMetricsSchema.parse({
        traceQualityDocumentationLink: 'https://example.com',
        scores: [{ key: 'score1', label: 'Score 1', max: 100, value: 'not-a-number' }],
        metrics: [],
      })
    ).toThrow(z.ZodError);
  });

  it('rejects missing or non-array metrics', () => {
    expect(() =>
      QualityMetricsSchema.parse({
        traceQualityDocumentationLink: 'https://example.com',
        scores: [],
      })
    ).toThrow(z.ZodError);
  });

  it('rejects invalid metric object', () => {
    expect(() =>
      QualityMetricsSchema.parse({
        traceQualityDocumentationLink: 'https://example.com',
        scores: [],
        metrics: [{ name: 'm1', category: 'c1' }],
      })
    ).toThrow(z.ZodError);
  });

  it('rejects invalid bannerText type', () => {
    expect(() =>
      QualityMetricsSchema.parse({
        traceQualityDocumentationLink: 'https://example.com',
        bannerText: 12345,
        scores: [],
        metrics: [],
      })
    ).toThrow(z.ZodError);
  });

  it('accepts bannerText object without optional styling', () => {
    const data = {
      traceQualityDocumentationLink: 'https://example.com',
      bannerText: {
        value: 'Banner without styling',
      },
      scores: [],
      metrics: [],
    };
    expect(QualityMetricsSchema.parse(data)).toEqual(data);
  });

  it('defaults null client examples and detail columns/rows to empty arrays', () => {
    const parsed = QualityMetricsSchema.parse({
      traceQualityDocumentationLink: 'https://example.com/docs',
      scores: [],
      metrics: [
        {
          name: 'm1',
          category: 's1',
          description: 'd1',
          metricDocumentationLink: 'https://example.com',
          metricWeight: 1,
          passCount: 1,
          failureCount: 0,
          details: [{ columns: null, rows: null }],
        },
      ],
      clients: [{ version: '1.0.0', minVersion: '0.9.0', count: 1, examples: null }],
    });
    expect(parsed.metrics[0].details?.[0].columns).toEqual([]);
    expect(parsed.metrics[0].details?.[0].rows).toEqual([]);
    expect(parsed.clients?.[0].examples).toEqual([]);
  });

  it('rejects missing detail columns and rows and missing client examples', () => {
    const metric = {
      name: 'm1',
      category: 's1',
      description: 'd1',
      metricDocumentationLink: 'https://example.com',
      metricWeight: 1,
      passCount: 1,
      failureCount: 0,
    };
    const base = {
      traceQualityDocumentationLink: 'https://example.com/docs',
      scores: [],
    };

    expect(() =>
      QualityMetricsSchema.parse({
        ...base,
        metrics: [{ ...metric, details: [{ rows: [] }] }],
      })
    ).toThrow(z.ZodError);

    expect(() =>
      QualityMetricsSchema.parse({
        ...base,
        metrics: [{ ...metric, details: [{ columns: [] }] }],
      })
    ).toThrow(z.ZodError);

    expect(() =>
      QualityMetricsSchema.parse({
        ...base,
        metrics: [metric],
        clients: [{ version: '1.0.0', minVersion: '0.9.0', count: 1 }],
      })
    ).toThrow(z.ZodError);
  });
});
