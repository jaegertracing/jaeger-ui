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

      x┌──────────┐x
      x│ Span A   │x
      x└──────────┘x
      xxxxxxxxxxxxxx     ┌─────────────────────────────────────┐
                         │              Span B                 │
                         └─────────────────────────────────────┘


Span B will be dropped and span A is on critical path
*/

const trace = require('../../TraceStatistics/tableValuesTestTrace/traceWithSingleChildSpanLongerThanParent.json');

const transformedTrace = transformTraceData(trace);

const sanitizedSpanData = [transformedTrace.spans[0]];

const refinedSpanData = sanitizedSpanData;
refinedSpanData[0].childSpanIds = [];

const criticalPathSections = [
  {
    spanId: '006c3cf93508f205',
    section_start: 1679437737490189,
    section_end: 1679437737490225,
  },
];

const test3 = {
  criticalPathSections,
  trace: transformedTrace,
  sanitizedSpanData,
  refinedSpanData,
  rootSpanId: '006c3cf93508f205',
  lfcInputSpan: '006c3cf93508f205',
  lfc: undefined,
  lfcWithSpawnTime: undefined,
  spawnTime: undefined,
};

export default test3;
