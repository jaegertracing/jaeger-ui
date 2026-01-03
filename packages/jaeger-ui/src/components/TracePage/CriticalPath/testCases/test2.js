// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import transformTraceData from '../../../../model/transform-trace-data';

/*                                                       |
 ┌─────────────────────────────────────────────────┐     |
 │                      Span X                     │     |
 └──────┬───────┬─────────────────▲──────▲─────────┘     |           
 +++++++│+++++++│                 │      |++++++++++     |            span X       
        ▼───────┼─────────────────┤      |               |           /     \
        │       │ Span A          │      |               |          /       \
        └───────┼─────────────────┘      |               |      span A     span C
                │                        |               |
                │                        |               |
                ▼────────────────────────┤               |     (parent-child tree)
                │         Span C         │               | 
                └────────────────────────┘               |
                ++++++++++++++++++++++++++               |
                                                         |
Here ++++++ is critical path                             |
*/
const happyTrace = {
  traceID: 'trace-123',
  spans: [
    {
      spanID: 'span-X',
      operationName: 'op1',
      startTime: 1,
      duration: 100,
      references: [],
      processID: 'p1',
      tags: [],
      logs: [],
    },
    {
      spanID: 'span-A',
      operationName: 'op2',
      startTime: 10,
      duration: 40,
      references: [
        {
          refType: 'CHILD_OF',
          spanID: 'span-X',
        },
      ],
      processID: 'p1',
      tags: [],
      logs: [],
    },
    {
      spanID: 'span-C',
      operationName: 'op3',
      startTime: 20,
      duration: 40,
      references: [
        {
          refType: 'CHILD_OF',
          spanID: 'span-X',
        },
      ],
      processID: 'p1',
      tags: [],
      logs: [],
    },
  ],
  processes: {
    p1: {
      serviceName: 'service1',
      tags: [],
    },
  },
};

const transformedTrace = transformTraceData(happyTrace);

const criticalPathSections = [
  {
    spanId: 'span-X',
    section_start: 60,
    section_end: 101,
  },
  {
    spanId: 'span-C',
    section_start: 20,
    section_end: 60,
  },
  {
    spanId: 'span-X',
    section_start: 1,
    section_end: 20,
  },
];

const test2 = {
  criticalPathSections,
  trace: transformedTrace,
};

export default test2;
