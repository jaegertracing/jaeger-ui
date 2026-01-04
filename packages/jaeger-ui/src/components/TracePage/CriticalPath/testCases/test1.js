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
      spanID: 'span-E',
      operationName: 'operation E',
      references: [
        {
          refType: 'CHILD_OF',
          spanID: 'span-C',
        },
      ],
      startTime: 50,
      duration: 10,
      processID: 'p1',
    },
    {
      spanID: 'span-C',
      operationName: 'operation C',
      references: [],
      startTime: 1,
      duration: 100,
      processID: 'p1',
    },
    {
      spanID: 'span-D',
      operationName: 'operation D',
      references: [
        {
          refType: 'CHILD_OF',
          spanID: 'span-C',
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
    spanID: 'span-C',
    sectionStart: 60,
    sectionEnd: 101,
  },
  {
    spanID: 'span-E',
    sectionStart: 50,
    sectionEnd: 60,
  },
  {
    spanID: 'span-C',
    sectionStart: 40,
    sectionEnd: 50,
  },
  {
    spanID: 'span-D',
    sectionStart: 20,
    sectionEnd: 40,
  },
  {
    spanID: 'span-C',
    sectionStart: 1,
    sectionEnd: 20,
  },
];

const test1 = {
  criticalPathSections,
  trace: transformedTrace,
};

export default test1;
