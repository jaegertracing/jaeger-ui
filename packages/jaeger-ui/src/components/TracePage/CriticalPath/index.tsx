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
import getChildOfSpans from './utils/getChildOfSpans';
import findLastFinishingChildSpan from './utils/findLastFinishingChildSpan';
import sanitizeOverFlowingChildren from './utils/sanitizeOverFlowingChildren';

export const computeCriticalPath = (
  spanMap: Map<string, Span>,
  spanId: string,
  criticalPath: criticalPathSection[],
  spawnTime?: number
): criticalPathSection[] => {
  // spawnTime refers to spawn synchronization event of current span
  const currentSpan: Span = spanMap.get(spanId)!;

  const lastFinishingChildSpan = findLastFinishingChildSpan(spanMap, currentSpan, spawnTime);
  let spanCriticalSection: criticalPathSection;

  if (lastFinishingChildSpan) {
    spanCriticalSection = {
      spanId: currentSpan.spanID,
      section_start: lastFinishingChildSpan.startTime + lastFinishingChildSpan.duration,
      section_end: spawnTime || currentSpan.startTime + currentSpan.duration,
    };
    if (spanCriticalSection.section_start !== spanCriticalSection.section_end) {
      criticalPath.push(spanCriticalSection);
    }
    // Now lfc turns to the currentspan and we again do the same algorithm
    computeCriticalPath(spanMap, lastFinishingChildSpan.spanID, criticalPath);
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
      const parentSpanId: string = currentSpan.references.filter(
        reference => reference.refType === 'CHILD_OF'
      )[0].spanID;
      computeCriticalPath(spanMap, parentSpanId, criticalPath, currentSpan.startTime);
    }
  }
  return criticalPath;
};

function TraceCriticalPath(trace: Trace) {
  let criticalPath: criticalPathSection[] = [];
  // As spans are already sorted based on startTime first span is always rootSpan
  const rootSpanId = trace.spans[0].spanID;
  // If there is root span then algorithm implements
  if (rootSpanId) {
    const sanitizedSpanData = sanitizeOverFlowingChildren(trace.spans);
    const refinedSpanData = getChildOfSpans(sanitizedSpanData);
    const spanMap = refinedSpanData.reduce((map, span) => {
      map.set(span.spanID, span);
      return map;
    }, new Map<string, Span>());
    criticalPath = computeCriticalPath(spanMap, rootSpanId, []);
  }
  return criticalPath;
}

const memoizedTraceCriticalPath = memoizeOne(TraceCriticalPath);

export default memoizedTraceCriticalPath;
