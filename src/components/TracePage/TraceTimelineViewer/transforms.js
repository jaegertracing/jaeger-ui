// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import * as traceSelectors from '../../../selectors/trace';

const cache = new Map();
export function transformTrace(trace) {
  if (cache.has(trace.traceID)) {
    return cache.get(trace.traceID);
  }
  traceSelectors.hydrateSpansWithProcesses(trace);
  const Tree = traceSelectors.getTraceSpanIdsAsTree(trace);
  const spanMap = traceSelectors.getTraceSpansAsMap(trace);
  const spans = [];
  const traceStartTime = traceSelectors.getTraceTimestamp(trace);
  const traceEndTime = traceSelectors.getTraceEndTimestamp(trace);
  Tree.walk((spanID, value) => {
    if (spanID === '__root__') {
      return;
    }
    const span = spanMap.get(spanID);
    spans.push({
      ...span,
      relativeStartTime: span.startTime - traceStartTime,
      depth: traceSelectors.getSpanDepthForTrace({ trace, span }) - 1,
      hasChildren: value.children.length > 0,
    });
  });
  const transform = {
    ...trace,
    duration: traceSelectors.getTraceDuration(trace),
    startTime: traceStartTime,
    endTime: traceEndTime,
    spans,
  };
  cache.set(trace.traceID, transform);
  return transform;
}
