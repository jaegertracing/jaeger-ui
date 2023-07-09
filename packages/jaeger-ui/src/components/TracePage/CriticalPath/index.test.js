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
import test1 from './testResults/test1';
import test2 from './testResults/test2';
import test3 from './testResults/test3';

describe.each([[test1], [test2], [test3]])('findRootSpanId', testProps => {
  it('Should find RootSpanId correctly', () => {
    const rootSpanId = findRootSpanId(testProps.trace.spans);
    expect(rootSpanId).toBe(testProps.rootSpanId);
  });
});

describe.each([[test1], [test2], [test3]])('findChildSpanIds', testProps => {
  it('Should find child spanIds correctly and also in sortorder of endTime', () => {
    const sanitizedData = sanitizeOverFlowingChildren(testProps.trace.spans);
    const refinedSpanData = findChildSpanIds(sanitizedData);
    expect(refinedSpanData.length).toBe(testProps.refinedSpanData.length);
    expect(refinedSpanData).toStrictEqual(testProps.refinedSpanData);
  });
});

describe.each([[test1], [test2], [test3]])('findLastFinishingChildSpanId', testProps => {
  it('Should find lfc of a span correctly', () => {
    const sanitizedData = sanitizeOverFlowingChildren(testProps.trace.spans);
    const refinedSpanData = findChildSpanIds(sanitizedData);
    const traceData = { ...testProps.trace, spans: refinedSpanData };

    let currentSpan = traceData.spans.filter(span => span.spanID === testProps.lfcInputSpan)[0];
    let lastFinishingChildSpanId = findLastFinishingChildSpanId(traceData, currentSpan);
    expect(lastFinishingChildSpanId).toBe(testProps.lfc);

    // Second Case to check if it works with spawn time or not
    currentSpan = traceData.spans.filter(span => span.spanID === testProps.lfcInputSpan)[0];
    lastFinishingChildSpanId = findLastFinishingChildSpanId(traceData, currentSpan, testProps.spawnTime);
    expect(lastFinishingChildSpanId).toBe(testProps.lfcWithSpawnTime);
  });
});

describe.each([[test1], [test2], [test3]])('Happy Path', testProps => {
  it('Should find criticalPathSections correctly', () => {
    const sanitizedData = sanitizeOverFlowingChildren(testProps.trace.spans);
    const refinedSpanData = findChildSpanIds(sanitizedData);
    const traceData = { ...testProps.trace, spans: refinedSpanData };
    const criticalPath = computeCriticalPath(traceData, testProps.rootSpanId, []);
    expect(criticalPath).toStrictEqual(testProps.criticalPathSections);
  });

  it('Critical path sections', () => {
    const criticalPath = TraceCriticalPath(testProps.trace);
    expect(criticalPath).toStrictEqual(testProps.criticalPathSections);
  });
});
