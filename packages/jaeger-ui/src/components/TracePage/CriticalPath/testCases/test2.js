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
      spanID: 'span-x',
      operationName: 'op1',
      startTime: 1,
      duration: 100,
      references: [],
      processID: 'p1',
      tags: [],
      logs: [],
    },
    {
      spanID: 'span-a',
      operationName: 'op2',
      startTime: 10,
      duration: 40,
      references: [
        {
          refType: 'CHILD_OF',
          spanID: 'span-x',
        },
      ],
      processID: 'p1',
      tags: [],
      logs: [],
    },
    {
      spanID: 'span-c',
      operationName: 'op3',
      startTime: 20,
      duration: 40,
      references: [
        {
          refType: 'CHILD_OF',
          spanID: 'span-x',
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
    spanID: 'span-x',
    sectionStart: 60,
    sectionEnd: 101,
  },
  {
    spanID: 'span-c',
    sectionStart: 20,
    sectionEnd: 60,
  },
  {
    spanID: 'span-x',
    sectionStart: 1,
    sectionEnd: 20,
  },
];

const test2 = {
  criticalPathSections,
  trace: transformedTrace.asOtelTrace(),
};

export default test2;
