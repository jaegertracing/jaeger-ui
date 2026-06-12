// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import transformTraceData from '../../../model/transform-trace-data';
import { mockTrace } from './mockTrace';
import { buildAvailableFields, buildSummaryLookup } from './summaryFieldsUtils';

describe('summaryFieldsUtils', () => {
  const trace = transformTraceData(mockTrace)!.asOtelTrace();

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
});
