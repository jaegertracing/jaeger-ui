// Copyright (c) 2019 The Jaeger Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import transformTraceData from '../../../model/transform-trace-data';
import calculateTraceDagEV, { mapFollowsFrom } from './calculateTraceDagEV';
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
    const traceDag = calculateTraceDagEV(transformedTrace);
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

describe('mapFollowsFrom', () => {
  it('sets followsFrom false if node has CHILD_OF reference and e.to is number', () => {
    const mockEdges = [{ from: 0, to: 0 }];
    const mockNodes = [
      {
        members: [
          {
            span: {
              references: [{ refType: 'CHILD_OF' }],
            },
          },
        ],
      },
    ];

    const result = mapFollowsFrom(mockEdges, mockNodes);
    expect(result[0].followsFrom).toBe(false);
  });

  it('sets followsFrom true if node does NOT have CHILD_OF reference and e.to is number', () => {
    const mockEdges = [{ from: 0, to: 0 }];
    const mockNodes = [
      {
        members: [
          {
            span: {
              references: [{ refType: 'FOLLOWS_FROM' }],
            },
          },
        ],
      },
    ];

    const result = mapFollowsFrom(mockEdges, mockNodes);
    expect(result[0].followsFrom).toBe(true);
  });
});

describe('mapFollowsFrom - reference combinations', () => {
  const testCases = [
    {
      name: 'only CHILD_OF',
      references: [{ refType: 'CHILD_OF' }],
      expected: false,
    },
    {
      name: 'multiple CHILD_OF',
      references: [{ refType: 'CHILD_OF' }, { refType: 'CHILD_OF' }],
      expected: false,
    },
    {
      name: 'only FOLLOWS_FROM',
      references: [{ refType: 'FOLLOWS_FROM' }],
      expected: true,
    },
    {
      name: 'CHILD_OF followed by FOLLOWS_FROM',
      references: [{ refType: 'CHILD_OF' }, { refType: 'FOLLOWS_FROM' }],
      expected: false,
    },
    {
      name: 'FOLLOWS_FROM followed by CHILD_OF',
      references: [{ refType: 'FOLLOWS_FROM' }, { refType: 'CHILD_OF' }],
      expected: false,
    },
    {
      name: 'no references at all',
      references: [],
      expected: true,
    },
  ];

  testCases.forEach(({ name, references, expected }) => {
    it(`sets followsFrom correctly when ${name}`, () => {
      const mockEdges = [{ from: 0, to: 0 }];
      const mockNodes = [
        {
          members: [
            {
              span: {
                references,
              },
            },
          ],
        },
      ];

      const result = mapFollowsFrom(mockEdges, mockNodes);
      expect(result[0].followsFrom).toBe(expected);
    });
  });
});
