// Copyright (c) 2017 Uber Technologies, Inc.
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

import TraceCriticalPath, {
  findRootSpanId,
  findChildSpanIds,
  findLastFinishingChildSpanId,
  computeCriticalPath,
} from './index';
import transformTraceData from '../../../model/transform-trace-data';
import criticalPathSections from './testResults/test1';

const testTrace = require('../TraceStatistics/tableValuesTestTrace/testTraceNormal.json');

const transformedTrace = transformTraceData(testTrace);

const defaultProps = {
  trace: transformedTrace,
};

describe('Happy Path', () => {
  it('Should find RootSpanId correctly', () => {
    const rootSpanId = findRootSpanId(defaultProps.trace.spans);
    expect(rootSpanId).toBe('150c193cf155b46b');
  });

  it('Should find child spanIds correctly and also in sortorder of endTime', () => {
    const refinedSpanData = findChildSpanIds(defaultProps.trace.spans);
    expect(refinedSpanData.length).toBe(5);
    expect(refinedSpanData[0].childSpanIds).toStrictEqual(['22be69e72cbcde0b']);
    expect(refinedSpanData[1].childSpanIds).toStrictEqual(['e821b549888cbc3b']);
    expect(refinedSpanData[2].childSpanIds).toStrictEqual(['622a5079b565623e', '4085dddb47429851']);
    expect(refinedSpanData[3].childSpanIds.length).toBe(0);
    expect(refinedSpanData[4].childSpanIds.length).toBe(0);
  });

  it('Should find lfc of a span correctly', () => {
    const refinedSpanData = findChildSpanIds(defaultProps.trace.spans);
    const traceData = { ...transformedTrace, spans: refinedSpanData };

    let currentSpan = traceData.spans.filter(span => span.spanID === 'e821b549888cbc3b')[0];
    let lastFinishingChildSpanId = findLastFinishingChildSpanId(traceData, currentSpan);
    expect(lastFinishingChildSpanId).toBe('622a5079b565623e');

    // Second Case to check if it works with spawn time or not
    currentSpan = traceData.spans.filter(span => span.spanID === 'e821b549888cbc3b')[0];
    lastFinishingChildSpanId = findLastFinishingChildSpanId(traceData, currentSpan, 1579070675085840);
    expect(lastFinishingChildSpanId).toBe('4085dddb47429851');
  });

  it('Should find criticalPathSections correctly', () => {
    const refinedSpanData = findChildSpanIds(defaultProps.trace.spans);
    const traceData = { ...transformedTrace, spans: refinedSpanData };
    const criticalPath = computeCriticalPath(traceData, '150c193cf155b46b', []);
    expect(criticalPath).toStrictEqual(criticalPathSections);
  });

  it('Critical path sections', () => {
    const consoleLogMock = jest.spyOn(console, 'log').mockImplementation();
    TraceCriticalPath(defaultProps);
    expect(consoleLogMock).toHaveBeenCalledWith(criticalPathSections);
  });
});
