// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import transformTraceData from '../../../../model/transform-trace-data';

/*
                    ┌──────────┐        |
                    │ Span A   │        |                 span A
                    └──────────┘        |                  /
                    ++++++++++++        |                 /
    ┌────────────┐                      |              span B
    │  Span B    │                      |               
    └────────────┘                      |      (parent-child tree)
spanB will be dropped.                  |
span A is on critical path(+++++)       |
*/

const trace = {
  traceID: 'trace-abc',
  spans: [
    {
      spanID: 'span-A',
      operationName: 'op-A',
      references: [],
      startTime: 10,
      duration: 20,
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
      startTime: 1,
      duration: 4,
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
    section_start: 10,
    section_end: 30,
  },
];

const test9 = {
  criticalPathSections,
  trace: transformedTrace,
};

export default test9;
