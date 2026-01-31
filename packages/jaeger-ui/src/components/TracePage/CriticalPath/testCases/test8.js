// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import transformTraceData from '../../../../model/transform-trace-data';

/*
             ┌─────────────────┐                 |
             │     Span A      │                 |                         spanA
             └─────────────────┘                 |                          /   
                                                 |                         /            
          ┌──────────────────────┐               |                       spanB (CHILD_OF) 
          │        Span B        │               |                       
          └──────────────────────┘               |              ((parent-child tree))      
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
      startTime: 5,
      duration: 30,
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
    spanID: 'span-B',
    sectionStart: 10,
    sectionEnd: 30,
  },
];

const test8 = {
  criticalPathSections,
  trace: transformedTrace.asOtelTrace(),
};

export default test8;
