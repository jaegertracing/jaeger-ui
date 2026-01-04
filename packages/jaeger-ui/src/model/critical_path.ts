// Copyright (c) 2026 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

// It is a section of span that lies on critical path
export type CriticalPathSection = {
  spanID: string;
  section_start: number;
  section_end: number;
  // TODO: rename section_start/end to camelCase
};

// Reference type used in CPSpan for critical path computation
export type CPSpanReference = {
  refType: 'CHILD_OF' | 'FOLLOWS_FROM';

  span?: CPSpan | null | undefined;
  spanID: string;
  traceID?: string;
};

// Critical Path Span - a minimal span type used for critical path computation
// This type contains only the fields needed for critical path algorithms
// and ensures the original trace spans are not modified during computation
export type CPSpan = {
  spanID: string;
  startTime: number;
  duration: number;
  references: ReadonlyArray<CPSpanReference>;
  childSpanIDs: ReadonlyArray<string>;
};
