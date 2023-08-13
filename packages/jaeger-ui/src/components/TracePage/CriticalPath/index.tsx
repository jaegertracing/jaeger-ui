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

import memoizeOne from 'memoize-one';
import { Span, Trace, criticalPathSection } from '../../../types/trace';
import removeFollowFromChildSpans from './utils/getChildOfSpans';
import findLastFinishingChildSpanId from './utils/findLastFinishingChildSpanId';
import findRootSpanId from './utils/findRootSpanId';
import sanitizeOverFlowingChildren from './utils/sanitizeOverFlowingChildren';

export const computeCriticalPath = (
  traceData: Trace,
  spanId: string,
  criticalPath: criticalPathSection[],
  spawnTime?: number
): criticalPathSection[] => {
  // spawnTime refers to spawn synchronization event of current span
  const currentSpan: Span = traceData.spans.find(span => span.spanID === spanId)!;

  const lastFinishingChildSpanId = findLastFinishingChildSpanId(traceData, currentSpan, spawnTime);
  let spanCriticalSection: criticalPathSection;

  if (lastFinishingChildSpanId) {
    const lfcSpan = traceData.spans.filter(span => span.spanID === lastFinishingChildSpanId)[0];
    spanCriticalSection = {
      spanId: currentSpan.spanID,
      section_start: lfcSpan.startTime + lfcSpan.duration,
      section_end: spawnTime || currentSpan.startTime + currentSpan.duration,
    };
    if (spanCriticalSection.section_start !== spanCriticalSection.section_end) {
      criticalPath.push(spanCriticalSection);
    }
    // Now lfc turns to the currentspan and we again do the same algorithm
    computeCriticalPath(traceData, lastFinishingChildSpanId, criticalPath);
  } else {
    // If there is no last finishing child then total section upto startTime of span is on critical path
    spanCriticalSection = {
      spanId: currentSpan.spanID,
      section_start: currentSpan.startTime,
      section_end: spawnTime || currentSpan.startTime + currentSpan.duration,
    };
    if (spanCriticalSection.section_start !== spanCriticalSection.section_end) {
      criticalPath.push(spanCriticalSection);
    }
    // Now as there are no lfc's it goes back to parent span from startTime(spawn Event)
    if (currentSpan.references.length) {
      const parentSpan: string = currentSpan.references.filter(
        reference => reference.refType === 'CHILD_OF'
      )[0].spanID;
      computeCriticalPath(traceData, parentSpan, criticalPath, currentSpan.startTime);
    }
  }
  return criticalPath;
};

function TraceCriticalPath(trace: Trace) {
  let traceData: Trace = trace;
  let criticalPath: criticalPathSection[] = [];
  const rootSpanId = findRootSpanId(trace.spans);
  // If there is root span then algorithm implements
  if (rootSpanId) {
    const sanitizedSpanData = sanitizeOverFlowingChildren(trace.spans);
    const refinedSpanData = removeFollowFromChildSpans(sanitizedSpanData);
    traceData = { ...traceData, spans: refinedSpanData };
    criticalPath = computeCriticalPath(traceData, rootSpanId, []);
  }
  return criticalPath;
}

const memoizedTraceCriticalPath = memoizeOne(TraceCriticalPath);

export default memoizedTraceCriticalPath;
