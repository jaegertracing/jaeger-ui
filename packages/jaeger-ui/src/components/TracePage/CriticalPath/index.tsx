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

/**
 * Computes the critical path sections of a Jaeger trace.
 * The algorithm begins with the top-level span and iterates through the last finishing children (LFCs).
 * It recursively computes the critical path for each LFC span.
 * @param spanMap - A map associating span IDs with spans.
 * @param spanId - The ID of the current span.
 * @param criticalPath - An array of critical path sections.
 * @returns - An array of critical path sections for the trace.
 * @example -
 * |-------------spanA--------------|
 *    |--spanB--|    |--spanC--|
 * The LFC of spanA is spanC, as it finishes last among its child spans.
 */
const computeCriticalPath = (
  spanMap: Map<string, Span>,
  spanId: string,
  criticalPath: criticalPathSection[]
): criticalPathSection[] => {
  const currentSpan: Span = spanMap.get(spanId)!;
  let criticalPathBoundary = currentSpan.startTime + currentSpan.duration;

  for (let i = 0; i < currentSpan.childSpanIds.length; i++) {
    const child: Span = spanMap.get(currentSpan.childSpanIds[i])!;
    const childEndTime = child.startTime + child.duration;
    if (childEndTime <= criticalPathBoundary) {
      const spanCriticalSection = {
        spanId: currentSpan.spanID,
        section_start: childEndTime,
        section_end: criticalPathBoundary,
      };
      if (spanCriticalSection.section_start < spanCriticalSection.section_end) {
        criticalPath.push(spanCriticalSection);
      }
      computeCriticalPath(spanMap, child.spanID, criticalPath);
      criticalPathBoundary = child.startTime;
    }
  }

  const spanCriticalSection = {
    spanId: currentSpan.spanID,
    section_start: currentSpan.startTime,
    section_end: criticalPathBoundary,
  };
  if (spanCriticalSection.section_start < spanCriticalSection.section_end) {
    criticalPath.push(spanCriticalSection);
  }

  return criticalPath;
};

function criticalPathForTrace(trace: Trace) {
  let criticalPath: criticalPathSection[] = [];
  // As spans are already sorted based on startTime first span is always rootSpan
  const rootSpanId = trace.spans[0].spanID;
  // If there is root span then algorithm implements
  if (rootSpanId) {
    const spanMap = trace.spans.reduce((map, span) => {
      map.set(span.spanID, span);
      return map;
    }, new Map<string, Span>());
    try {
      const refinedSpanMap = getChildOfSpans(spanMap);
      const sanitizedSpanMap = sanitizeOverFlowingChildren(refinedSpanMap);
      criticalPath = computeCriticalPath(sanitizedSpanMap, rootSpanId, criticalPath);
    } catch (error) {
      /* eslint-disable no-console */
      console.log('error while computing critical path for a trace', error);
    }
  }
  return criticalPath;
}

const memoizedTraceCriticalPath = memoizeOne(criticalPathForTrace);

export default memoizedTraceCriticalPath;
