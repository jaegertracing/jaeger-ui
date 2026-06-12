// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import traceGenerator from '../../../demo/trace-generators';
import transformTraceData from '../../../model/transform-trace-data';
import { SpanData, TraceData } from '../../../types/trace';
import { buildAvailableFields, buildSummaryLookup } from './summaryFieldsUtils';

const summaryFieldsTestTrace: TraceData & { spans: SpanData[] } = {
  traceID: 'test-trace-summary-fields',
  spans: [
    {
      spanID: 'span-001',
      traceID: 'test-trace-summary-fields',
      operationName: 'checkout',
      duration: 1000,
      startTime: 1,
      processID: 'p1',
      references: [],
      tags: [
        { key: 'http.status_code', value: '200' },
        { key: 'customer.id', value: 'cust-319' },
      ],
    },
    {
      spanID: 'span-002',
      traceID: 'test-trace-summary-fields',
      operationName: 'validate',
      duration: 1000,
      startTime: 2,
      processID: 'p1',
      references: [],
      tags: [
        { key: 'http.status_code', value: '200' },
        { key: 'customer.id', value: 'cust-319' },
      ],
    },
    {
      spanID: 'span-003',
      traceID: 'test-trace-summary-fields',
      operationName: 'payment',
      duration: 1000,
      startTime: 3,
      processID: 'p1',
      references: [],
      tags: [
        { key: 'http.status_code', value: '200' },
        { key: 'customer.id', value: 'cust-319' },
      ],
    },
    {
      spanID: 'span-004',
      traceID: 'test-trace-summary-fields',
      operationName: 'reserve',
      duration: 1000,
      startTime: 4,
      processID: 'p1',
      references: [],
      tags: [
        { key: 'http.status_code', value: '200' },
        { key: 'customer.id', value: 'cust-319' },
      ],
    },
    {
      spanID: 'span-005',
      traceID: 'test-trace-summary-fields',
      operationName: 'inventory',
      duration: 1000,
      startTime: 5,
      processID: 'p1',
      references: [],
      tags: [{ key: 'http.status_code', value: '200' }],
    },
    {
      spanID: 'span-006',
      traceID: 'test-trace-summary-fields',
      operationName: 'charge',
      duration: 1000,
      startTime: 6,
      processID: 'p1',
      references: [],
      tags: [
        { key: 'http.status_code', value: '500' },
        { key: 'customer.id', value: 'cust-319' },
      ],
    },
    {
      spanID: 'span-007',
      traceID: 'test-trace-summary-fields',
      operationName: 'ledger',
      duration: 1000,
      startTime: 7,
      processID: 'p1',
      references: [],
      tags: [
        { key: 'http.status_code', value: '200' },
        { key: 'customer.id', value: 'cust-319' },
      ],
    },
    {
      spanID: 'span-008',
      traceID: 'test-trace-summary-fields',
      operationName: 'audit',
      duration: 1000,
      startTime: 8,
      processID: 'p1',
      references: [],
      tags: [
        { key: 'http.status_code', value: '200' },
        { key: 'customer.id', value: 'cust-319' },
      ],
    },
    {
      spanID: 'span-009',
      traceID: 'test-trace-summary-fields',
      operationName: 'cache',
      duration: 1000,
      startTime: 9,
      processID: 'p1',
      references: [],
      tags: [{ key: 'http.status_code', value: '200' }],
    },
    {
      spanID: 'span-010',
      traceID: 'test-trace-summary-fields',
      operationName: 'metrics',
      duration: 1000,
      startTime: 10,
      processID: 'p1',
      references: [],
      tags: [
        { key: 'http.status_code', value: '200' },
        { key: 'customer.id', value: 'cust-319' },
      ],
    },
  ],
  processes: {
    p1: { serviceName: 'checkout-api', tags: [] },
  },
};

describe('summaryFieldsUtils', () => {
  const trace = transformTraceData(summaryFieldsTestTrace)!.asOtelTrace();

  it('buildAvailableFields returns attribute keys with coverage from mock trace', () => {
    const fields = buildAvailableFields(trace);
    expect(fields.length).toBeGreaterThan(0);
    const customerId = fields.find(f => f.key === 'customer.id');
    expect(customerId).toEqual({ key: 'customer.id', coverage: 8, total: 10 });
  });

  it('buildSummaryLookup maps span attributes for selected fields', () => {
    const lookup = buildSummaryLookup(trace, ['customer.id', 'http.status_code']);
    expect(lookup.get('span-006')).toEqual({
      'customer.id': 'cust-319',
      'http.status_code': '500',
    });
    expect(lookup.get('span-005')).toEqual({
      'http.status_code': '200',
    });
  });

  it('buildSummaryLookup memoizes and builds large-trace lookup in one pass', () => {
    const largeTrace = transformTraceData(traceGenerator.trace({ numberOfSpans: 15000 }))!.asOtelTrace();
    expect(largeTrace.spans.length).toBe(15000);

    const selectedFields = buildAvailableFields(largeTrace)
      .slice(0, 2)
      .map(field => field.key);
    expect(selectedFields.length).toBeGreaterThan(0);

    const lookup1 = buildSummaryLookup(largeTrace, selectedFields);
    const lookup2 = buildSummaryLookup(largeTrace, selectedFields);
    expect(lookup1).toBe(lookup2);

    const selectedFieldSet = new Set(selectedFields);
    let expectedSpanCount = 0;
    for (const span of largeTrace.spans) {
      const hasSelectedField = span.attributes.some(attr => selectedFieldSet.has(attr.key));
      if (hasSelectedField) {
        expectedSpanCount += 1;
      }
    }
    expect(lookup1.size).toBe(expectedSpanCount);
  });
});
