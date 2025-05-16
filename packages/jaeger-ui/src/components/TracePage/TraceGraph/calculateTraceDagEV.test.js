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
import calculateTraceDagEV from './calculateTraceDagEV';
import testTrace from './testTrace.json';

const transformedTrace = transformTraceData(testTrace);

function assertData(nodes, service, operation, count, errors, time, percent, selfTime) {
  const d = nodes.find(({ data: n }) => n.service === service && n.operation === operation).data;
  expect(d).toBeDefined();
  expect(d.count).toBe(count);
  expect(d.errors).toBe(errors);
  expect(d.time).toBe(time);  // Already in microseconds
  expect(d.percent).toBeCloseTo(percent, 2);
  expect(d.selfTime).toBe(selfTime);  // Already in microseconds
}

describe('calculateTraceDagEV', () => {
  it('calculates TraceGraph with overlapping spans', () => {
    // Create a test trace with overlapping spans
    const overlappingTrace = {
      traceID: 'test-overlap',
      spans: [
        {
          traceID: 'test-overlap',
          spanID: 'parent',
          processID: 'p1',
          operationName: 'parent-op',
          startTime: 1000000,
          duration: 1000000,
          process: { serviceName: 'test-svc' }
        },
        {
          traceID: 'test-overlap',
          spanID: 'child1',
          processID: 'p1',
          operationName: 'child-op',
          references: [{ refType: 'CHILD_OF', spanID: 'parent' }],
          startTime: 1100000,
          duration: 500000,
          process: { serviceName: 'test-svc' }
        },
        {
          traceID: 'test-overlap',
          spanID: 'child2',
          processID: 'p1',
          operationName: 'child-op',
          references: [{ refType: 'CHILD_OF', spanID: 'parent' }],
          startTime: 1300000,
          duration: 500000,
          process: { serviceName: 'test-svc' }
        }
      ],
      processes: {
        p1: { serviceName: 'test-svc' }
      }
    };

    const transformedOverlap = transformTraceData(overlappingTrace);
    const traceDag = calculateTraceDagEV(transformedOverlap);
    const { vertices: nodes } = traceDag;

    // Find the child operation node (with overlapping spans)
    const childNode = nodes.find(({ data: n }) => n.operation === 'child-op');
    expect(childNode).toBeDefined();
    
    // Spans overlap from 1300000 to 1600000 (300000μs)
    // Total duration should be 700000μs (union of [1100000,1600000] and [1300000,1800000])
    // Not 1000000μs (sum of individual durations)
    expect(childNode.data.time).toBe(700000);
    
    // Verify child duration is less than parent duration (1000000μs)
    const parentNode = nodes.find(({ data: n }) => n.operation === 'parent-op');
    expect(parentNode).toBeDefined();
    expect(childNode.data.time).toBeLessThanOrEqual(parentNode.data.time);
  });
});
