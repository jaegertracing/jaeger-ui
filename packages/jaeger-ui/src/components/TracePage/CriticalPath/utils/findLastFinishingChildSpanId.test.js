// Copyright (c) 2023 The Jaeger Authors
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

import test1 from '../testCases/test1';
import test2 from '../testCases/test2';
import getChildOfSpans from './getChildOfSpans';
import findLastFinishingChildSpanId from './findLastFinishingChildSpanId';
import sanitizeOverFlowingChildren from './sanitizeOverFlowingChildren';

describe('findLastFinishingChildSpanId', () => {
  it('Should find lfc of a span correctly', () => {
    const sanitizedSpanData = sanitizeOverFlowingChildren(test1.trace.spans);
    const refinedSpanData = getChildOfSpans(sanitizedSpanData);
    const traceData = { ...test1.trace, spans: refinedSpanData };
    const spanMap = refinedSpanData.reduce((map, span) => {
      map.set(span.spanID, span);
      return map;
    }, new Map());

    let currentSpan = traceData.spans.filter(span => span.spanID === 'span-C')[0];
    let lastFinishingChildSpanId = findLastFinishingChildSpanId(spanMap, currentSpan);
    expect(lastFinishingChildSpanId).toBe('span-E');

    // Second Case to check if it works with spawn time or not
    currentSpan = traceData.spans.filter(span => span.spanID === 'span-C')[0];
    lastFinishingChildSpanId = findLastFinishingChildSpanId(spanMap, currentSpan, 50);
    expect(lastFinishingChildSpanId).toBe('span-D');
  });

  it('Should find lfc of a span correctly', () => {
    const sanitizedSpanData = sanitizeOverFlowingChildren(test2.trace.spans);
    const refinedSpanData = getChildOfSpans(sanitizedSpanData);
    const traceData = { ...test2.trace, spans: refinedSpanData };
    const spanMap = refinedSpanData.reduce((map, span) => {
      map.set(span.spanID, span);
      return map;
    }, new Map());

    let currentSpan = traceData.spans.filter(span => span.spanID === 'span-X')[0];
    let lastFinishingChildSpanId = findLastFinishingChildSpanId(spanMap, currentSpan);
    expect(lastFinishingChildSpanId).toBe('span-C');

    // Second Case to check if it works with spawn time or not
    currentSpan = traceData.spans.filter(span => span.spanID === 'span-X')[0];
    lastFinishingChildSpanId = findLastFinishingChildSpanId(spanMap, currentSpan, 20);
    expect(lastFinishingChildSpanId).toBeUndefined();
  });
});
