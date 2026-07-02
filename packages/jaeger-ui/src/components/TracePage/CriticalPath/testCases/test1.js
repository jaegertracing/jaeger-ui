// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import transformTraceData from '../../../../model/transform-trace-data';

/*

     ┌──────────────────────────────────────┐       |            
     │             Span C                   │       |          
     └──┬──────────▲─────────┬──────────▲───┘       |           span C
     +++│          │+++++++++│          │++++       |           /    \
        │          │         │          │           |          /      \
        ▼──────────┤         ▼──────────┤           |       span D     span E
        │ Span D   │         │ Span E   │           |
        └──────────┘         └──────────┘           |      (parent-child tree)
        +++++++++++          ++++++++++++           |


Here +++++ are critical path sections
*/
const testTrace = {
  traceID: 'test1-trace',
  spans: [
    {
      spanID: 'span-e',
      operationName: 'operation E',
      references: [
        {
          refType: 'CHILD_OF',
          spanID: 'span-c',
        },
      ],
      startTime: 50,
      duration: 10,
      processID: 'p1',
    },
    {
      spanID: 'span-c',
      operationName: 'operation C',
      references: [],
      startTime: 1,
      duration: 100,
      processID: 'p1',
    },
    {
      spanID: 'span-d',
      operationName: 'operation D',
      references: [
        {
          refType: 'CHILD_OF',
          spanID: 'span-c',
        },
      ],
      startTime: 20,
      duration: 20,
      processID: 'p1',
    },
  ],
  processes: {
    p1: {
      serviceName: 'customers-service',
    },
  },
};

const transformedTrace = transformTraceData(testTrace);

const criticalPathSections = [
  {
    spanID: 'span-c',
    sectionStart: 60,
    sectionEnd: 101,
  },
  {
    spanID: 'span-e',
    sectionStart: 50,
    sectionEnd: 60,
  },
  {
    spanID: 'span-c',
    sectionStart: 40,
    sectionEnd: 50,
  },
  {
    spanID: 'span-d',
    sectionStart: 20,
    sectionEnd: 40,
  },
  {
    spanID: 'span-c',
    sectionStart: 1,
    sectionEnd: 20,
  },
];

const test1 = {
  criticalPathSections,
  trace: transformedTrace.asOtelTrace(),
};

export default test1;
