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

import TraceCriticalPath, {
  findRootSpanId,
  findChildSpanIds,
  findLastFinishingChildSpanId,
  sanitizeOverFlowingChildren,
  computeCriticalPath,
} from './index';
import test1 from './testCases/test1';
import test2 from './testCases/test2';
import test3 from './testCases/test3';
import test4 from './testCases/test4';

describe.each([[test1], [test2], [test3], [test4]])('findRootSpanId', testProps => {
  it('Should find RootSpanId correctly', () => {
    const rootSpanId = findRootSpanId(testProps.trace.spans);
    expect(rootSpanId).toBe(testProps.rootSpanId);
  });
});

describe.each([[test1], [test2], [test3], [test4]])('sanitizeOverFlowingChildren',testProps => {
  it('Should sanitize the data(overflowing spans) correctly', () => {
    const sanitizedData = sanitizeOverFlowingChildren(testProps.trace.spans);
    expect(sanitizedData).toStrictEqual(testProps.sanitizedSpanData);
  });
})

describe.each([[test1], [test2], [test3], [test4]])('findChildSpanIds', testProps => {
  it('Should find child spanIds correctly and also in sortorder of endTime', () => {
    const refinedSpanData = findChildSpanIds(testProps.sanitizedSpanData);
    expect(refinedSpanData.length).toBe(testProps.refinedSpanData.length);
    expect(refinedSpanData).toStrictEqual(testProps.refinedSpanData);
  });
});

describe.each([[test1], [test2], [test3], [test4]])('findLastFinishingChildSpanId', testProps => {
  it('Should find lfc of a span correctly', () => {
    const traceData = { ...testProps.trace, spans: testProps.refinedSpanData };

    let currentSpan = traceData.spans.filter(span => span.spanID === testProps.lfcInputSpan)[0];
    let lastFinishingChildSpanId = findLastFinishingChildSpanId(traceData, currentSpan);
    expect(lastFinishingChildSpanId).toBe(testProps.lfc);

    // Second Case to check if it works with spawn time or not
    currentSpan = traceData.spans.filter(span => span.spanID === testProps.lfcInputSpan)[0];
    lastFinishingChildSpanId = findLastFinishingChildSpanId(traceData, currentSpan, testProps.spawnTime);
    expect(lastFinishingChildSpanId).toBe(testProps.lfcWithSpawnTime);
  });
});

describe.each([[test1], [test2], [test3], [test4]])('Happy Path', testProps => {
  it('Should find criticalPathSections correctly', () => {
    const traceData = { ...testProps.trace, spans: testProps.refinedSpanData };
    const criticalPath = computeCriticalPath(traceData, testProps.rootSpanId, []);
    expect(criticalPath).toStrictEqual(testProps.criticalPathSections);
  });

  it('Critical path sections', () => {
    const criticalPath = TraceCriticalPath(testProps.trace);
    expect(criticalPath).toStrictEqual(testProps.criticalPathSections);
  });
});
