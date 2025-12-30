// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import memoizeOne from 'memoize-one';
import { Span, Trace, criticalPathSection } from '../../../types/trace';
import getChildOfSpans from './utils/getChildOfSpans';
import findLastFinishingChildSpan from './utils/findLastFinishingChildSpan';
import sanitizeOverFlowingChildren from './utils/sanitizeOverFlowingChildren';

/**
 * Computes the critical path sections of a Jaeger trace.
 * The algorithm begins with the top-level span and iterates through the last finishing children (LFCs).
 * It recursively computes the critical path for each LFC span.
 * Upon return from recursion, the algorithm walks backward and picks another child that
 * finished just before the LFC's start.
 * @param spanMap - A map associating span IDs with spans.
 * @param spanId - The ID of the current span.
 * @param criticalPath - An array of critical path sections.
 * @param returningChildStartTime - Optional parameter representing the span's start time.
 *                    It is provided only during the recursive return phase.
 * @returns - An array of critical path sections for the trace.
 * @example -
 * |-------------spanA--------------|
 *    |--spanB--|    |--spanC--|
 * The LFC of spanA is spanC, as it finishes last among its child spans.
 * After invoking CP recursively on LFC, for spanC there is no LFC, so the algorithm walks backward.
 * At this point, it uses returningChildStartTime (startTime of spanC) to select another child that finished
 * immediately before the LFC's start.
 */
const computeCriticalPath = (
  spanMap: Map<string, Span>,
  spanId: string,
  criticalPath: criticalPathSection[],
  returningChildStartTime?: number
): criticalPathSection[] => {
  const currentSpan: Span = spanMap.get(spanId)!;

  const lastFinishingChildSpan = findLastFinishingChildSpan(spanMap, currentSpan, returningChildStartTime);
  let spanCriticalSection: criticalPathSection;

  if (lastFinishingChildSpan) {
    spanCriticalSection = {
      spanId: currentSpan.spanID,
      section_start: lastFinishingChildSpan.startTime + lastFinishingChildSpan.duration,
      section_end: returningChildStartTime || currentSpan.startTime + currentSpan.duration,
    };
    if (spanCriticalSection.section_start !== spanCriticalSection.section_end) {
      criticalPath.push(spanCriticalSection);
    }
    // Now focus shifts to the lastFinishingChildSpan of cuurent span
    computeCriticalPath(spanMap, lastFinishingChildSpan.spanID, criticalPath);
  } else {
    // If there is no last finishing child then total section upto startTime of span is on critical path
    spanCriticalSection = {
      spanId: currentSpan.spanID,
      section_start: currentSpan.startTime,
      section_end: returningChildStartTime || currentSpan.startTime + currentSpan.duration,
    };
    if (spanCriticalSection.section_start !== spanCriticalSection.section_end) {
      criticalPath.push(spanCriticalSection);
    }
    // Now as there are no lfc's focus shifts to parent span from startTime of span
    // return from recursion and walk backwards to one level depth to parent span
    // provide span's startTime as returningChildStartTime
    if (currentSpan.references.length) {
      const parentSpanId: string = currentSpan.references.filter(
        reference => reference.refType === 'CHILD_OF'
      )[0].spanID;
      computeCriticalPath(spanMap, parentSpanId, criticalPath, currentSpan.startTime);
    }
  }
  return criticalPath;
};

function criticalPathForTrace(trace: Trace) {
  let criticalPath: criticalPathSection[] = [];
  // As spans are already sorted based on startTime first span is always rootSpan
  const rootSpanId = trace.spans[0].spanID;
  // If there is root span then algorithm implements
  if (rootSpanId) {
    // Use the pre-built spanMap
    const spanMap = trace.spanMap;

    // Populate childSpanIds from childSpans for critical path computation
    // Critical path utilities need string[] not Span[] for manipulation
    const spanMapWithChildIds = new Map<string, Span>();
    spanMap.forEach((span, spanId) => {
      const childSpanIds = span.childSpans.map(child => child.spanID);
      spanMapWithChildIds.set(spanId, { ...span, childSpanIds });
    });

    try {
      const refinedSpanMap = getChildOfSpans(spanMapWithChildIds);
      const sanitizedSpanMap = sanitizeOverFlowingChildren(refinedSpanMap);
      criticalPath = computeCriticalPath(sanitizedSpanMap, rootSpanId, criticalPath);
    } catch (error) {
      console.log('error while computing critical path for a trace', error);
    }
  }
  return criticalPath;
}

const memoizedTraceCriticalPath = memoizeOne(criticalPathForTrace);

export default memoizedTraceCriticalPath;
