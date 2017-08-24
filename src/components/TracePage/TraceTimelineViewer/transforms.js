// @flow
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

import {
  getTraceDuration,
  getTraceEndTimestamp,
  getTraceSpanIdsAsTree,
  getTraceSpansAsMap,
  getTraceTimestamp,
} from '../../../selectors/trace';
import type { Process, Span } from '../../../types';

type SpanWithProcess = Span & { process: Process };

export type XformedSpan = SpanWithProcess & {
  depth: number,
  hasChildren: boolean,
  relativeStartTime: number,
};

type TracePartial = {
  processes: { [string]: Process },
  traceID: string,
};

export type XformedTrace = TracePartial & {
  duration: number,
  endTime: number,
  spans: XformedSpan[],
  startTime: number,
};

const cache: Map<string, ?XformedTrace> = new Map();

// eslint-disable-next-line import/prefer-default-export
export function transformTrace(trace: TracePartial & { spans: SpanWithProcess[] }): XformedTrace {
  const cached = cache.get(trace.traceID);
  if (cached) {
    return cached;
  }
  const traceStartTime = getTraceTimestamp(trace);
  const traceEndTime = getTraceEndTimestamp(trace);
  const spanMap: Map<string, ?SpanWithProcess> = getTraceSpansAsMap(trace);
  const tree = getTraceSpanIdsAsTree(trace);
  const spans: XformedSpan[] = [];

  tree.walk((spanID, node, depth) => {
    if (spanID === '__root__') {
      return;
    }
    const span: ?SpanWithProcess = spanMap.get(spanID);
    if (!span) {
      return;
    }
    spans.push({
      ...span,
      relativeStartTime: span.startTime - traceStartTime,
      depth: depth - 1,
      hasChildren: node.children.length > 0,
    });
  });
  const transform = {
    spans,
    // can't use spread operator for intersection types
    // repl: https://goo.gl/4Z23MJ
    // issue: https://github.com/facebook/flow/issues/1511
    processes: trace.processes,
    traceID: trace.traceID,
    duration: getTraceDuration(trace),
    startTime: traceStartTime,
    endTime: traceEndTime,
  };
  cache.set(trace.traceID, transform);
  return transform;
}
