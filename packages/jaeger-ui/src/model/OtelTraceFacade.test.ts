// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import OtelTraceFacade from './OtelTraceFacade';
import { Trace, Span, Process } from '../types/trace';
import TreeNode from '../utils/TreeNode';

describe('OtelTraceFacade', () => {
  const mockProcess: Process = {
    serviceName: 'test-service',
    tags: [],
  };

  const mockSpan: Span = {
    traceID: 'trace-1',
    spanID: 'span-1',
    operationName: 'test-op',
    startTime: 1000,
    duration: 500,
    processID: 'p1',
    process: mockProcess,
    tags: [],
    logs: [],
    references: [],
    depth: 0,
    hasChildren: false,
    relativeStartTime: 0,
    childSpanIds: [],
    warnings: [],
    subsidiarilyReferencedBy: [],
  };

  const mockLegacyTrace: Trace = {
    traceID: 'trace-1',
    spans: [mockSpan],
    processes: { p1: mockProcess },
    duration: 500,
    startTime: 1000,
    endTime: 1500,
    traceName: 'test-trace',
    tracePageTitle: 'test-trace-title',
    traceEmoji: '😀',
    services: [{ name: 'test-service', numberOfSpans: 1 }],
    spanMap: new Map([['span-1', mockSpan]]),
    tree: new TreeNode('__root__'),
    asOtelTrace() {
      throw new Error('Not implemented');
    },
  };

  let facade: OtelTraceFacade;

  beforeEach(() => {
    facade = new OtelTraceFacade(mockLegacyTrace);
  });

  it('maps basic trace fields', () => {
    expect(facade.traceId).toBe('trace-1');
    expect(facade.traceName).toBe('test-trace');
    expect(facade.durationMicros).toBe(500);
    expect(facade.startTimeUnixMicros).toBe(1000);
    expect(facade.endTimeUnixMicros).toBe(1500);
  });

  it('maps spans to OtelSpanFacade instances', () => {
    expect(facade.spans).toHaveLength(1);
    expect(facade.spans[0].spanId).toBe('span-1');
    expect(facade.spans[0].name).toBe('test-op');
  });

  it('maps services summary', () => {
    expect(facade.services).toEqual([{ name: 'test-service', numberOfSpans: 1 }]);
  });
});
