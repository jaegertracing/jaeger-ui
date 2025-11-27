// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import transformTraceData from '../../../../model/transform-trace-data';

/*
    ┌──────────┐                         |
    │ Span A   │                         |  
    └──────────┘                         |
    ++++++++++++  ┌────────────┐         |              span A
                  │  Span B    │         |              /    
                  └┬───────▲───┘         |             /      
                   │       │             |           span B
                   │       │             |            /
                   ▼───────┤             |           /
                   │Span C │             |         span C
                   └───────┘             |
                                         |   (parent-child tree)
Both spanB and spanC will be dropped.    |
span A is on critical path(+++++)        |
*/

const trace = {
  traceID: 'trace-abc',
  spans: [
    {
      spanID: 'span-A',
      operationName: 'op-A',
      references: [],
      startTime: 1,
      duration: 30,
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
      startTime: 40,
      duration: 40,
      processID: 'p1',
    },
    {
      spanID: 'span-c',
      operationName: 'op-C',
      references: [
        {
          refType: 'CHILD_OF',
          spanID: 'span-B',
        },
      ],
      startTime: 50,
      duration: 10,
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
    spanId: 'span-A',
    section_start: 1,
    section_end: 31,
  },
];

const test4 = {
  criticalPathSections,
  trace: transformedTrace,
};

export default test4;
