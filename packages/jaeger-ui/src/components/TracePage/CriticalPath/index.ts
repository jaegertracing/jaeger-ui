// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import memoizeOne from 'memoize-one';
import { IOtelTrace, IOtelSpan } from '../../../types/otel';
import { CriticalPathSection, CPSpan } from '../../../types/critical_path';
import createLastFinishingChildFinder from './utils/findLastFinishingChildSpan';
import sanitizeOverFlowingChildren from './utils/sanitizeOverFlowingChildren';
import { createCPSpanMap } from './utils/cpspan';

/**
 * Computes the critical path sections of a trace.
 * The algorithm begins with the top-level span and iterates through the last finishing children (LFCs).
 * It moves to each LFC span in turn and computes the critical path for it.
 * When a span has no LFC left, the algorithm walks backward to the parent and picks another child that
 * finished just before the LFC's start.
 * @param spanMap - A map associating span IDs with spans.
 * @param spanId - The ID of the current span.
 * @param criticalPath - An array of critical path sections.
 * @returns - An array of critical path sections for the trace.
 * @example -
 * |-------------spanA--------------|
 *    |--spanB--|    |--spanC--|
 * The LFC of spanA is spanC, as it finishes last among its child spans.
 * After moving to the LFC, for spanC there is no LFC, so the algorithm walks backward.
 * At this point, it uses returningChildStartTime (startTime of spanC) to select another child that finished
 * immediately before the LFC's start.
 */
const computeCriticalPath = (
  spanMap: Map<string, CPSpan>,
  spanId: string,
  criticalPath: CriticalPathSection[]
): CriticalPathSection[] => {
  const findLastFinishingChildSpan = createLastFinishingChildFinder(spanMap);
  let currentSpan: CPSpan | undefined = spanMap.get(spanId);
  let returningChildStartTime: IOtelSpan['startTime'] | undefined;

  while (currentSpan) {
    const lastFinishingChildSpan = findLastFinishingChildSpan(currentSpan, returningChildStartTime);
    let spanCriticalSection: CriticalPathSection;

    if (lastFinishingChildSpan) {
      spanCriticalSection = {
        spanID: currentSpan.spanID,
        sectionStart: lastFinishingChildSpan.endTime,
        sectionEnd: (returningChildStartTime || currentSpan.endTime) as IOtelSpan['endTime'],
      };
      if (spanCriticalSection.sectionStart !== spanCriticalSection.sectionEnd) {
        criticalPath.push(spanCriticalSection);
      }
      // Now focus shifts to the lastFinishingChildSpan of current span
      currentSpan = lastFinishingChildSpan;
      returningChildStartTime = undefined;
    } else {
      // If there is no last finishing child then total section upto startTime of span is on critical path
      spanCriticalSection = {
        spanID: currentSpan.spanID,
        sectionStart: currentSpan.startTime,
        sectionEnd: (returningChildStartTime || currentSpan.endTime) as IOtelSpan['endTime'],
      };
      if (spanCriticalSection.sectionStart !== spanCriticalSection.sectionEnd) {
        criticalPath.push(spanCriticalSection);
      }
      // Now as there are no LFCs, focus shifts to parent span from startTime of span
      // walk backwards to one level depth to parent span
      // provide span's startTime as returningChildStartTime
      returningChildStartTime = currentSpan.startTime;
      currentSpan = currentSpan.parentSpanID ? spanMap.get(currentSpan.parentSpanID) : undefined;
    }
  }
  return criticalPath;
};

type CriticalPathResult = {
  sections: CriticalPathSection[];
  failed: boolean;
  errors: string[];
};

function criticalPathForTrace(trace: IOtelTrace): CriticalPathResult {
  let sections: CriticalPathSection[] = [];
  const errors: string[] = [];
  for (const rootSpan of trace.rootSpans) {
    try {
      // Create a map of CPSpan objects for this root span's tree,
      // filtering out non-blocking subtrees during creation.
      const sanitizedSpanMap = sanitizeOverFlowingChildren(createCPSpanMap(rootSpan));
      sections = computeCriticalPath(sanitizedSpanMap, rootSpan.spanID, sections);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Critical path computation failed for root span', rootSpan.spanID, error);
      errors.push(`Root span ${rootSpan.spanID}: ${message}`);
    }
  }
  return { sections, failed: errors.length > 0, errors };
}

const memoizedTraceCriticalPath = memoizeOne(criticalPathForTrace);

export default memoizedTraceCriticalPath;
