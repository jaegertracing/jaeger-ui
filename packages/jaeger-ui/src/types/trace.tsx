// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * All timestamps are in microseconds
 */

import { IOtelTrace } from './otel';

export type KeyValuePair<ValueType = string> = {
  key: string;
  value: ValueType;
};

export type Link = {
  url: string;
  text: string;
};

export type Log = {
  timestamp: number;
  fields: Array<KeyValuePair>;
};

export type Process = {
  serviceName: string;
  tags: Array<KeyValuePair>;
};

export type SpanReference = {
  refType: 'CHILD_OF' | 'FOLLOWS_FROM';

  span: Span | null | undefined;
  spanID: string;
  traceID: string;
};

export type SpanData = {
  spanID: string;
  traceID: string;
  processID: string;
  operationName: string;
  startTime: number;
  duration: number;
  logs: Array<Log>;
  tags?: Array<KeyValuePair>;
  references?: Array<SpanReference>;
  warnings?: Array<string> | null;
};

export type Span = SpanData & {
  depth: number;
  hasChildren: boolean;
  process: Process;
  relativeStartTime: number;
  tags: NonNullable<SpanData['tags']>;
  references: NonNullable<SpanData['references']>;
  warnings: NonNullable<SpanData['warnings']>;
  subsidiarilyReferencedBy: Array<SpanReference>;
  childSpans: Array<Span>;
};

export type TraceData = {
  processes: Record<string, Process>;
  traceID: string;
};

export type Trace = TraceData & {
  duration: number;
  endTime: number;
  spans: Span[];
  startTime: number;
  traceName: string;
  tracePageTitle: string;
  traceEmoji: string;
  services: { name: string; numberOfSpans: number }[];
  // Number of orphan spans (spans referencing parent spans that don't exist in the trace)
  orphanSpanCount?: number;

  // Optimized data structures - created once during trace transformation
  spanMap: Map<string, Span>;
  rootSpans: Array<Span>;

  // OTEL facade - lazy-initialized and memoized
  _otelFacade?: IOtelTrace;
  asOtelTrace(): IOtelTrace;
};

// It is a section of span that lies on critical path
export type criticalPathSection = {
  spanId: string;
  section_start: number;
  section_end: number;
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
  references: Array<CPSpanReference>;
  childSpanIds: Array<string>;
};
