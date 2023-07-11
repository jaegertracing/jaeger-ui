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

const sanitizedSpanData = transformedTrace.spans;
const refinedSpanData = transformedTrace.spans;
refinedSpanData[0].childSpanIds = ['span-E', 'span-D'];
refinedSpanData[1].childSpanIds = [];
refinedSpanData[2].childSpanIds = [];

const criticalPathSections = [
  {
    spanId: 'span-C',
    section_start: 60,
    section_end: 101,
  },
  {
    spanId: 'span-E',
    section_start: 50,
    section_end: 60,
  },
  {
    spanId: 'span-C',
    section_start: 40,
    section_end: 50,
  },
  {
    spanId: 'span-D',
    section_start: 20,
    section_end: 40,
  },
  {
    spanId: 'span-C',
    section_start: 1,
    section_end: 20,
  },
];

const test1 = {
  criticalPathSections,
  trace: transformedTrace,
  sanitizedSpanData,
  refinedSpanData,
  rootSpanId: 'span-C',
  lfcInputSpan: 'span-C',
  lfc: 'span-E',
  lfcWithSpawnTime: 'span-D',
  spawnTime: 50,
};

export default test1;
