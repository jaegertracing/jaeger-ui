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
