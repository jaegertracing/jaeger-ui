// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import transformTraceData from '../../../../model/transform-trace-data';
/*
                                                  |
      ┌──────────┐                                |
      │ Span A   │                                |          span A
      └──────────┘                                |           /
      ++++++++++++    ┌───────────────────┐       |          /
                      │      Span B       │       |      span B
                      └───────────────────┘       |
                                                  |   (parent-child tree)
                                                  | 
Span B will be dropped.                           |
span A is on critical path(+++++)                 |
*/

import trace from '../../TraceStatistics/tableValuesTestTrace/traceWithSingleChildLongerThanParentAndStartsAfterParent.json';

const transformedTrace = transformTraceData(trace);
const traceStart = 100;

const criticalPathSections = [
  {
    spanID: '006c3cf93508f205',
    section_start: traceStart,
    section_end: traceStart + 40,
  },
];

const test3 = {
  criticalPathSections,
  trace: transformedTrace,
};

export default test3;
