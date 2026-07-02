// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import transformTraceData from '../../../../model/transform-trace-data';

/*
   ┌─────────────────┐                    |
   │     Span A      │                    |                         spanA
   └───────┬─────────┘                    |                          /   
           │                              |                         /            
          ┌▼──────────────┐               |                       spanB  
          │    Span B     │               |                       /
          └─────┬─────────┘               |                      /   
                │                         |                     spanC
               ┌▼─────────────┐           |
               │    Span C    │           |             ((parent-child tree))
               └──────────────┘           |
*/

const trace = {
  traceID: 'trace-abc',
  spans: [
    {
      spanID: 'span-a',
      operationName: 'op-A',
      references: [],
      startTime: 1,
      duration: 29,
      processID: 'p1',
    },
    {
      spanID: 'span-b',
      operationName: 'op-B',
      references: [
        {
          refType: 'CHILD_OF',
          spanID: 'span-a',
        },
      ],
      startTime: 15,
      duration: 20,
      processID: 'p1',
    },
    {
      spanID: 'span-c',
      operationName: 'op-C',
      references: [
        {
          refType: 'CHILD_OF',
          spanID: 'span-b',
        },
      ],
      startTime: 20,
      duration: 20,
      processID: 'p1',
    },
  ],
  processes: {
    p1: {
      serviceName: 'service-one',
    },
  },
};

const transformedTrace = transformTraceData(trace);

const criticalPathSections = [
  {
    spanID: 'span-c',
    sectionStart: 20,
    sectionEnd: 30,
  },
  {
    spanID: 'span-b',
    sectionStart: 15,
    sectionEnd: 20,
  },
  {
    spanID: 'span-a',
    sectionStart: 1,
    sectionEnd: 15,
  },
];

const test7 = {
  criticalPathSections,
  trace: transformedTrace.asOtelTrace(),
};

export default test7;
