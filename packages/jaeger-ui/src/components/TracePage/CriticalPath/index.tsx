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

import { Span, Trace } from '../../../types/trace';

// It is a section of span that lies on critical path
type criticalPathSection = {
  spanId: string;
  section_start: number;
  section_end: number;
};

export const findRootSpanId = (spans: Span[]): string | undefined => {
  const rootSpan = spans.find(span => span.references.length === 0 && span.depth === 0);
  return rootSpan?.spanID;
};

// This function finds child spans for each span and also sorts childSpanIds based on endTime
export const findChildSpanIds = (spans: Span[]): Span[] => {
  const refinedSpanData: Span[] = [];
  spans.forEach(span => {
    if (span.hasChildren) {
      const Children = spans
        .filter(span2 =>
          span2.references.some(
            reference => reference.refType === 'CHILD_OF' && reference.spanID === span.spanID
          )
        )
        .sort((a, b) => b.startTime + b.duration - (a.startTime + a.duration))
        .map(span2 => span2.spanID);
      refinedSpanData.push({ ...span, childSpanIds: Children });
    } else {
      refinedSpanData.push({ ...span, childSpanIds: [] });
    }
  });
  return refinedSpanData;
};

// This function finds LFC of a current span which is less than the spawn event
export const findLastFinishingChildSpanId = (
  traceData: Trace,
  currentSpan: Span,
  spawnTime?: number
): string | undefined => {
  if (spawnTime) {
    return currentSpan.childSpanIds.find(each =>
      traceData.spans.some(span => span.spanID === each && span.startTime + span.duration < spawnTime)
    );
  }
  return currentSpan.childSpanIds[0];
};

// This function turncates/drops the overflowing child spans
export const sanitizeOverFlowingChildren = (spans: Span[]): Span[] => {
  const sanitizedSpanData: Span[] = [];
  const droppedSpans: Span[] = [];
  const refinedSantitizedSpanData: Span[] = [];

  spans.forEach(span => {
    if (span.references.length) {
      const parentSpan = span.references.filter(ref => ref.refType === 'CHILD_OF')[0].span!;
      const childEndTime = span.startTime + span.duration;
      const parentEndTime = parentSpan.startTime + parentSpan.duration;
      if (span.startTime >= parentSpan.startTime && childEndTime <= parentEndTime) {
        // case 1: everything looks good
        // |----parent----|
        //   |----child--|
        sanitizedSpanData.push(span);
      } else if (
        span.startTime < parentSpan.startTime &&
        childEndTime <= parentEndTime &&
        childEndTime > parentSpan.startTime
      ) {
        // case 2: child start before parent, truncate is needed
        //      |----parent----|
        //   |----child--|
        sanitizedSpanData.push({
          ...span,
          startTime: parentSpan.startTime,
          duration: childEndTime - parentSpan.startTime,
        });
      } else if (
        span.startTime >= parentSpan.startTime &&
        childEndTime > parentEndTime &&
        span.startTime < parentEndTime
      ) {
        // case 3: child end after parent, truncate is needed
        //      |----parent----|
        //              |----child--|
        sanitizedSpanData.push({ ...span, duration: parentEndTime - span.startTime });
      } else {
        // case 4: child outside of parent range =>  drop the child span
        //      |----parent----|
        //                        |----child--|
        // or
        //                      |----parent----|
        //       |----child--|
        droppedSpans.push({ ...span });
      }
    } else {
      sanitizedSpanData.push(span);
    }
  });
  // This make sure to also drop the all childs of dropped spans
  sanitizedSpanData.forEach(span => {
    if (span.references.length && span.references[0].refType === 'CHILD_OF') {
      const childOfDroppedSpan = droppedSpans.find(b => span.references[0].spanID === b.spanID);
      if (childOfDroppedSpan) {
        droppedSpans.push(span);
      } else {
        refinedSantitizedSpanData.push(span);
      }
    } else {
      refinedSantitizedSpanData.push(span);
    }
  });

  return refinedSantitizedSpanData;
};

export const computeCriticalPath = (
  traceData: Trace,
  spanId: string,
  criticalPath: criticalPathSection[],
  spawnTime?: number
) => {
  // spawnTime refers to spawn synchronization event of current span
  const currentSpan: Span = traceData.spans.filter(span => span.spanID === spanId)[0];

  const lastFinishingChildSpanId = findLastFinishingChildSpanId(traceData, currentSpan, spawnTime);
  let spanCriticalSection: criticalPathSection;

  if (lastFinishingChildSpanId) {
    const lfcSpan = traceData.spans.filter(span => span.spanID === lastFinishingChildSpanId)[0];
    spanCriticalSection = {
      spanId: currentSpan.spanID,
      section_start: lfcSpan.startTime + lfcSpan.duration,
      section_end: spawnTime || currentSpan.startTime + currentSpan.duration,
    };
    criticalPath.push(spanCriticalSection);
    // Now lfc turns to the currentspan and we again do the same algorithm
    computeCriticalPath(traceData, lastFinishingChildSpanId, criticalPath);
  } else {
    // If there is no last finishing child then total section upto startTime of span is on critical path
    spanCriticalSection = {
      spanId: currentSpan.spanID,
      section_start: currentSpan.startTime,
      section_end: spawnTime || currentSpan.startTime + currentSpan.duration,
    };
    criticalPath.push(spanCriticalSection);
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
    const refinedSpanData: Span[] = findChildSpanIds(sanitizedSpanData);
    traceData = { ...traceData, spans: refinedSpanData };
    criticalPath = computeCriticalPath(traceData, rootSpanId, []);
    return criticalPath;
  }
  return null;
}

export default TraceCriticalPath;
