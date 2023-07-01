// Copyright (c) 2017 Uber Technologies, Inc.
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

type Tprops = {
  trace: Trace;
};

// It is a section of span that lies on critical path
type criticalPathSection = {
  spanId: string;
  section_start: number;
  section_end: number;
};

function TraceCriticalPath(props: Tprops) {
  let traceData: Trace;
  const criticalPath: criticalPathSection[] = [];

  const findRootSpanId = (spans: Span[]): string | undefined => {
    const rootSpan = spans.find(span => span.references.length === 0 && span.depth === 0);
    return rootSpan?.spanID;
  };

  // This function finds child spans for each span
  const findChildSpanIds = (spans: Span[]): Span[] => {
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

  const computeCriticalPath = (spanId: string, spawnTime?: number) => {
    // spawnTime refers to spawn synchronization event of current span
    const currentSpan: Span = traceData.spans.filter(span => span.spanID === spanId)[0];
    let lastFinishingChildSpanId: string | undefined;
    let spanCriticalSection: criticalPathSection;
    if (spawnTime) {
      lastFinishingChildSpanId = currentSpan.childSpanIds.find(each => {
        return (
          traceData.spans.filter(span => span.spanID === each && span.startTime + span.duration < spawnTime)
            .length > 0
        );
      });
    } else {
      lastFinishingChildSpanId = currentSpan.childSpanIds[0];
    }

    if (lastFinishingChildSpanId) {
      const lfcSpan = traceData.spans.filter(span => span.spanID === lastFinishingChildSpanId)[0];
      spanCriticalSection = {
        spanId: currentSpan.spanID,
        section_start: lfcSpan.startTime + lfcSpan.duration,
        section_end: spawnTime || currentSpan.startTime + currentSpan.duration,
      };
      criticalPath.push(spanCriticalSection);
      computeCriticalPath(lastFinishingChildSpanId);
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
        computeCriticalPath(parentSpan, currentSpan.startTime);
      }
    }
  };

  traceData = props.trace;
  const rootSpanId = findRootSpanId(props.trace.spans);
  // If there is root span then algorithm implements
  if (rootSpanId) {
    const refinedSpanData: Span[] = findChildSpanIds(props.trace.spans);
    traceData = { ...traceData, spans: refinedSpanData };
    computeCriticalPath(rootSpanId);
    console.log(criticalPath);
    // Now you got the critical path sections
  }
  return null;
}

export default TraceCriticalPath;
