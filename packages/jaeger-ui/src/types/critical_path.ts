// Copyright (c) 2026 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

// A section of a span that lies on the critical path
export type CriticalPathSection = {
  spanID: string;
  sectionStart: number;
  sectionEnd: number;
};

// Critical Path Span - a minimal span type used for critical path computation
// This type contains only the fields needed for critical path algorithms
// and ensures the original trace spans are not modified during computation
export type CPSpan = {
  spanID: string;
  parentSpanID?: string;
  isBlocking: boolean; // is this span blocking the critical path of the parent?
  startTime: number;
  endTime: number;
  duration: number;
  childSpanIDs: string[];
};
