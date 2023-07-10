// Copyright (c) 2023 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import transformTraceData from '../../../../model/transform-trace-data';

/*
 + ┌───────────────────────────────────────────────────────────────────────┐+
 + │                               Span X                                  │+
 + └────┬───────┬───────────────────▲────────▲─────────────────────────────┘+
 +++++++│+++++++│                   │        |+++++++++++++++++++++++++++++++
        ◄───────┼───────────────────┤        |+
        │       │ Span A            │        |+
        └───────┼───────────────────┘        |+
               +│                            |+
               +│                            |+
               +└▲───────────────────────────┤+ 
               + │        Span C             │+     
               + └───────────────────────────┘+        
               ++++++++++++++++++++++++++++++++    
                                                    
Here ++++++ is critical path
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
    },
  ],
  processes: {
    p1: {
      serviceName: 'service1',
    },
  },
};

const transformedTrace = transformTraceData(happyTrace);

const sanitizedSpanData = transformedTrace.spans;
const refinedSpanData = transformedTrace.spans;
refinedSpanData[0].childSpanIds = ['span-C', 'span-A'];
refinedSpanData[1].childSpanIds = [];
refinedSpanData[2].childSpanIds = [];

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
  sanitizedSpanData,
  refinedSpanData,
  rootSpanId: 'span-X',
  lfcInputSpan: 'span-X',
  lfc: 'span-C',
  lfcWithSpawnTime: undefined,
  spawnTime: 20,
};

export default test2;
