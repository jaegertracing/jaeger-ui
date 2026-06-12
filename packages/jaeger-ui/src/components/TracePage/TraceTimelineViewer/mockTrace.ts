// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { SpanData, TraceData } from '../../../types/trace';

const mockSpans: SpanData[] = [
  {
    spanID: 'span-001',
    traceID: 'mock-trace-abc123',
    operationName: 'HTTP POST /api/checkout',
    duration: 1740000,
    startTime: 1717891200000000,
    processID: 'p1',
    references: [],
    tags: [
      { key: 'http.status_code', value: '200' },
      { key: 'customer.id', value: 'cust-319' },
    ],
  },
  {
    spanID: 'span-002',
    traceID: 'mock-trace-abc123',
    operationName: 'validateCart',
    duration: 320000,
    startTime: 1717891200100000,
    processID: 'p1',
    references: [{ refType: 'CHILD_OF', spanID: 'span-001', traceID: 'mock-trace-abc123' }],
    tags: [
      { key: 'http.status_code', value: '200' },
      { key: 'customer.id', value: 'cust-319' },
    ],
  },
  {
    spanID: 'span-003',
    traceID: 'mock-trace-abc123',
    operationName: 'chargePayment',
    duration: 890000,
    startTime: 1717891200500000,
    processID: 'p2',
    references: [{ refType: 'CHILD_OF', spanID: 'span-001', traceID: 'mock-trace-abc123' }],
    tags: [
      { key: 'http.status_code', value: '200' },
      { key: 'customer.id', value: 'cust-319' },
    ],
  },
  {
    spanID: 'span-004',
    traceID: 'mock-trace-abc123',
    operationName: 'reserveInventory',
    duration: 450000,
    startTime: 1717891200800000,
    processID: 'p2',
    references: [{ refType: 'CHILD_OF', spanID: 'span-001', traceID: 'mock-trace-abc123' }],
    tags: [
      { key: 'http.status_code', value: '200' },
      { key: 'customer.id', value: 'cust-319' },
    ],
  },
  {
    spanID: 'span-005',
    traceID: 'mock-trace-abc123',
    operationName: 'sendConfirmation',
    duration: 210000,
    startTime: 1717891201200000,
    processID: 'p3',
    references: [{ refType: 'CHILD_OF', spanID: 'span-001', traceID: 'mock-trace-abc123' }],
    tags: [{ key: 'http.status_code', value: '200' }],
  },
  {
    spanID: 'span-006',
    traceID: 'mock-trace-abc123',
    operationName: 'notifyWarehouse',
    duration: 530000,
    startTime: 1717891201500000,
    processID: 'p3',
    references: [{ refType: 'CHILD_OF', spanID: 'span-001', traceID: 'mock-trace-abc123' }],
    tags: [
      { key: 'http.status_code', value: '500' },
      { key: 'customer.id', value: 'cust-319' },
    ],
  },
  {
    spanID: 'span-007',
    traceID: 'mock-trace-abc123',
    operationName: 'updateLedger',
    duration: 180000,
    startTime: 1717891202000000,
    processID: 'p2',
    references: [{ refType: 'CHILD_OF', spanID: 'span-003', traceID: 'mock-trace-abc123' }],
    tags: [
      { key: 'http.status_code', value: '200' },
      { key: 'customer.id', value: 'cust-319' },
    ],
  },
  {
    spanID: 'span-008',
    traceID: 'mock-trace-abc123',
    operationName: 'auditLog',
    duration: 95000,
    startTime: 1717891202200000,
    processID: 'p1',
    references: [{ refType: 'CHILD_OF', spanID: 'span-001', traceID: 'mock-trace-abc123' }],
    tags: [
      { key: 'http.status_code', value: '200' },
      { key: 'customer.id', value: 'cust-319' },
    ],
  },
  {
    spanID: 'span-009',
    traceID: 'mock-trace-abc123',
    operationName: 'cacheInvalidate',
    duration: 120000,
    startTime: 1717891202400000,
    processID: 'p3',
    references: [{ refType: 'CHILD_OF', spanID: 'span-006', traceID: 'mock-trace-abc123' }],
    tags: [{ key: 'http.status_code', value: '200' }],
  },
  {
    spanID: 'span-010',
    traceID: 'mock-trace-abc123',
    operationName: 'metricsEmit',
    duration: 80000,
    startTime: 1717891202600000,
    processID: 'p1',
    references: [{ refType: 'CHILD_OF', spanID: 'span-001', traceID: 'mock-trace-abc123' }],
    tags: [
      { key: 'http.status_code', value: '200' },
      { key: 'customer.id', value: 'cust-319' },
    ],
  },
];

export const mockTrace: TraceData & { spans: SpanData[] } = {
  traceID: 'mock-trace-abc123',
  spans: mockSpans,
  processes: {
    p1: { serviceName: 'checkout-api', tags: [] },
    p2: { serviceName: 'payment-service', tags: [] },
    p3: { serviceName: 'notification-service', tags: [] },
  },
};
