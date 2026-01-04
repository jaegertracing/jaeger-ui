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
      spanID: 'span-A',
      operationName: 'op-A',
      references: [],
      startTime: 1,
      duration: 29,
      processID: 'p1',
    },
    {
      spanID: 'span-B',
      operationName: 'op-B',
      references: [
        {
          refType: 'CHILD_OF',
          spanID: 'span-A',
        },
      ],
      startTime: 15,
      duration: 20,
      processID: 'p1',
    },
    {
      spanID: 'span-C',
      operationName: 'op-C',
      references: [
        {
          refType: 'CHILD_OF',
          spanID: 'span-B',
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
    spanID: 'span-C',
    sectionStart: 20,
    sectionEnd: 30,
  },
  {
    spanID: 'span-B',
    sectionStart: 15,
    sectionEnd: 20,
  },
  {
    spanID: 'span-A',
    sectionStart: 1,
    sectionEnd: 15,
  },
];

const test7 = {
  criticalPathSections,
  trace: transformedTrace.asOtelTrace(),
};

export default test7;
