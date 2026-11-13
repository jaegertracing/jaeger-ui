// Copyright (c) 2019 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import transformTraceData from '../../../model/transform-trace-data';
import { SpanKind } from '../../../types/otel';
import calculateTraceDagEV, { mapNonBlocking } from './calculateTraceDagEV';
import testTrace from './testTrace.json';

const transformedTrace = transformTraceData(testTrace);

function assertData(nodes, service, operation, count, errors, time, percent, selfTime) {
  const d = nodes.find(({ data: n }) => n.service === service && n.operation === operation).data;
  expect(d).toBeDefined();
  expect(d.count).toBe(count);
  expect(d.errors).toBe(errors);
  expect(d.time).toBe(time * 1000);
  expect(d.percent).toBeCloseTo(percent, 2);
  expect(d.selfTime).toBe(selfTime * 1000);
}

describe('calculateTraceDagEV', () => {
  it('calculates TraceGraph', () => {
    const traceDag = calculateTraceDagEV(transformedTrace.asOtelTrace());
    const { vertices: nodes } = traceDag;
    expect(nodes.length).toBe(9);
    assertData(nodes, 'service1', 'op1', 1, 0, 390, 39, 224);
    // accumulate data (count,times)
    assertData(nodes, 'service1', 'op2', 2, 1, 70, 7, 70);
    // self-time is substracted from child
    assertData(nodes, 'service1', 'op3', 1, 0, 66, 6.6, 46);
    assertData(nodes, 'service2', 'op1', 1, 0, 20, 2, 2);
    assertData(nodes, 'service2', 'op2', 1, 0, 18, 1.8, 18);
    // follows_from relation will not influence self-time
    assertData(nodes, 'service1', 'op4', 1, 0, 20, 2, 20);
    assertData(nodes, 'service2', 'op3', 1, 0, 200, 20, 200);
    // fork-join self-times are calculated correctly (self-time drange)
    assertData(nodes, 'service1', 'op6', 1, 0, 10, 1, 1);
    assertData(nodes, 'service1', 'op7', 2, 0, 17, 1.7, 17);
  });

  describe('zero-duration spans', () => {
    // transformTraceData mutates its input, so rebuild the raw spans instead of cloning testTrace.
    function buildTrace(adjustSpan) {
      const spans = testTrace.spans.map(
        ({ duration, flags, logs, operationName, processID, references, spanID, startTime, tags, traceID }) =>
          adjustSpan({
            duration,
            flags,
            logs,
            operationName,
            processID,
            references: references.map(({ refType, spanID: refSpanID, traceID: refTraceID }) => ({
              refType,
              spanID: refSpanID,
              traceID: refTraceID,
            })),
            spanID,
            startTime,
            tags,
            traceID,
          })
      );
      const { processes, traceID } = testTrace;
      return transformTraceData({ processes, spans, traceID }).asOtelTrace();
    }

    function getNodeData(trace, service, operation) {
      const { vertices } = calculateTraceDagEV(trace);
      return vertices.find(({ data: n }) => n.service === service && n.operation === operation).data;
    }

    it('reports 0 percent self time for an operation whose spans all have no duration', () => {
      const trace = buildTrace(span => (span.spanID === 'span-4' ? { ...span, duration: 0 } : span));
      // span-4 is the only span of service2 op1.
      const data = getNodeData(trace, 'service2', 'op1');
      expect(data.time).toBe(0);
      expect(data.percentSelfTime).toBe(0);
      expect(data.percent).toBe(0);
    });

    it('keeps finite percentages when the whole trace has no duration', () => {
      const start = testTrace.spans[0].startTime;
      const trace = buildTrace(span => ({ ...span, startTime: start, duration: 0 }));
      expect(trace.duration).toBe(0);
      calculateTraceDagEV(trace).vertices.forEach(({ data }) => {
        expect(data.percent).toBe(0);
        expect(data.percentSelfTime).toBe(0);
      });
    });
  });
});

describe('mapNonBlocking', () => {
  it('sets isNonBlocking false for blocking spans (CLIENT, SERVER, INTERNAL)', () => {
    const mockEdges = [{ from: 0, to: 0 }];
    const mockNodes = [
      {
        members: [
          {
            span: {
              kind: SpanKind.CLIENT, // Blocking span
            },
          },
        ],
      },
    ];

    const result = mapNonBlocking(mockEdges, mockNodes);
    expect(result[0].isNonBlocking).toBe(false);
  });

  it('sets isNonBlocking true for non-blocking CONSUMER spans', () => {
    const mockEdges = [{ from: 0, to: 0 }];
    const mockNodes = [
      {
        members: [
          {
            span: {
              kind: SpanKind.CONSUMER, // Non-blocking span (PRODUCER-CONSUMER pair)
            },
          },
        ],
      },
    ];

    const result = mapNonBlocking(mockEdges, mockNodes);
    expect(result[0].isNonBlocking).toBe(true);
  });
});

describe('mapNonBlocking - span kind combinations', () => {
  const testCases = [
    {
      name: 'CLIENT span (blocking)',
      kind: SpanKind.CLIENT,
      expected: false,
    },
    {
      name: 'SERVER span (blocking)',
      kind: SpanKind.SERVER,
      expected: false,
    },
    {
      name: 'INTERNAL span (blocking)',
      kind: SpanKind.INTERNAL,
      expected: false,
    },
    {
      name: 'PRODUCER span (blocking)',
      kind: SpanKind.PRODUCER,
      expected: false,
    },
    {
      name: 'CONSUMER span (non-blocking)',
      kind: SpanKind.CONSUMER,
      expected: true,
    },
  ];

  testCases.forEach(({ name, kind, expected }) => {
    it(`sets isNonBlocking correctly for ${name}`, () => {
      const mockEdges = [{ from: 0, to: 0 }];
      const mockNodes = [
        {
          members: [
            {
              span: {
                kind,
              },
            },
          ],
        },
      ];

      const result = mapNonBlocking(mockEdges, mockNodes);
      expect(result[0].isNonBlocking).toBe(expected);
    });
  });
});
