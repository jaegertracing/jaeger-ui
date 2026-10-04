// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import transformTraceData from './transform-trace-data';
import { SpanData, TraceData } from '../types/trace';
import { ITraceSpec } from './trace-contract-spec';
import { runTraceContractSuite } from './trace-contract-suite';

/** Renders a trace spec as the legacy /api/traces JSON that transformTraceData() reads. */
function toLegacyTrace({ traceID, serviceName, spans }: ITraceSpec): TraceData & { spans: SpanData[] } {
  const PROCESS_ID = 'p1';
  return {
    traceID,
    processes: { [PROCESS_ID]: { serviceName, tags: [] } },
    spans: spans.map(span => {
      const {
        spanID,
        operationName,
        parentSpanID,
        references = [],
        startTime,
        duration,
        tags,
      } = {
        startTime: 1,
        duration: 1,
        ...span,
      };
      const parentRef = parentSpanID ? [{ refType: 'CHILD_OF' as const, spanID: parentSpanID }] : [];
      return {
        traceID,
        spanID,
        operationName,
        references: [...parentRef, ...references].map(ref => ({ ...ref, traceID, span: undefined })),
        // SpanData requires timing fields, but explicit undefined values exercise missing-field handling.
        ...(startTime === undefined ? {} : { startTime }),
        ...(duration === undefined ? {} : { duration }),
        tags: tags ?? [],
        logs: [],
        processID: PROCESS_ID,
      } as SpanData;
    }),
  };
}

it.each([
  { timing: {}, expected: { startTime: 1, duration: 1 } },
  { timing: { startTime: undefined }, expected: { duration: 1 } },
  { timing: { duration: undefined }, expected: { startTime: 1 } },
  { timing: { startTime: 0, duration: 0 }, expected: { startTime: 0, duration: 0 } },
  { timing: { startTime: NaN }, expected: { startTime: NaN, duration: 1 } },
  { timing: { duration: NaN }, expected: { startTime: 1, duration: NaN } },
])('materializes timing $timing as $expected', ({ timing, expected }) => {
  const trace = toLegacyTrace({
    traceID: 'trace',
    serviceName: 'service',
    spans: [{ spanID: 'span', operationName: 'op', ...timing }],
  });
  expect(trace.spans[0].duration).toBe(expected.duration);
  expect(trace.spans[0].startTime).toBe(expected.startTime);
  expect(Object.hasOwn(trace.spans[0], 'startTime')).toBe(Object.hasOwn(expected, 'startTime'));
  expect(Object.hasOwn(trace.spans[0], 'duration')).toBe(Object.hasOwn(expected, 'duration'));
});

runTraceContractSuite({
  name: 'legacy transformer',
  materialize: toLegacyTrace,
  spanID: (label: string) => label,
  parse: (traceData: TraceData & { spans: SpanData[] }) => transformTraceData(traceData)!.asOtelTrace(),
});
