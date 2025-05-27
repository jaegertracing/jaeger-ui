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

import { Span, Trace } from '../types/trace';

/**
 * Creates a subtree of the trace starting from the specified span
 */
export function createSubtrace(trace: Trace, rootSpanId: string): Trace | null {
  if (!trace || !rootSpanId) return null;

  // Find the root span
  const rootSpan = trace.spans.find(span => span.spanID === rootSpanId);
  if (!rootSpan) return null;

  // Create a set of all descendant span IDs
  const descendants = new Set<string>();
  
  // Recursive function to collect all descendants
  function collectDescendants(spanId: string) {
    const span = trace.spans.find(s => s.spanID === spanId);
    if (!span) return;
    
    descendants.add(spanId);
    
    // Process children
    if (span.childSpanIds) {
      span.childSpanIds.forEach(childId => {
        collectDescendants(childId);
      });
    }
  }
  
  // Start collecting from the root span
  collectDescendants(rootSpanId);
  
  // Filter spans to include only the root and its descendants
  const filteredSpans = trace.spans.filter(span => descendants.has(span.spanID));
  
  // Adjust relative start times based on the new root span
  const subtreeStartTime = rootSpan.startTime;
  const adjustedSpans = filteredSpans.map(span => ({
    ...span,
    relativeStartTime: span.startTime - subtreeStartTime,
    depth: span.spanID === rootSpanId ? 0 : span.depth - rootSpan.depth,
  }));
  
  // Create the subtrace
  return {
    ...trace,
    spans: adjustedSpans,
    duration: rootSpan.duration,
    startTime: rootSpan.startTime,
    endTime: rootSpan.startTime + rootSpan.duration,
  };
}