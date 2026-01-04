// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import transformTraceData from '../../../../model/transform-trace-data';

/*
      ┌────────────────────┐                 |
      │     Span A         │                 |                  span A
      └───┬────────────────┘                 |                  /
          │                                  |                 /         
          ▼────────────┐                     |              span B(FOLLOW_FROM)
          │  Span B    │                     |                /
          └──────────▲─┘                     |               / 
            │        │                       |          span C(CHILD_OF)             
            ▼────────┐                       |              
            │ Span C │                       |
            └────────┘                       |        (parent-child tree)
                                             |              
Here span B is ref-type is 'FOLLOWS_FROM'    |
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
          refType: 'FOLLOWS_FROM',
          spanID: 'span-A',
        },
      ],
      startTime: 10,
      duration: 10,
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
      startTime: 12,
      duration: 2,
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
    spanID: 'span-A',
    sectionStart: 1,
    sectionEnd: 31,
  },
];

const test5 = {
  criticalPathSections,
  trace: transformedTrace,
};

export default test5;
