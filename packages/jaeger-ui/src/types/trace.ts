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

export type Log = {
  timestamp: number;
  fields: ReadonlyArray<KeyValuePair>;
};

export type Process = {
  serviceName: string;
  tags: ReadonlyArray<KeyValuePair>;
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
  tags?: ReadonlyArray<KeyValuePair>;
  logs?: ReadonlyArray<Log>;
  references?: ReadonlyArray<SpanReference>;
  warnings?: ReadonlyArray<string> | null;
};

export type Span = SpanData & {
  tags: NonNullable<SpanData['tags']>;
  logs: NonNullable<SpanData['logs']>;
  references: NonNullable<SpanData['references']>;
  warnings: NonNullable<SpanData['warnings']>;

  depth: number;
  relativeStartTime: number;
  process: Process;

  hasChildren: boolean;
  childSpans: ReadonlyArray<Span>;
  subsidiarilyReferencedBy: ReadonlyArray<SpanReference>;
};

export type TraceData = {
  processes: Record<string, Process>;
  traceID: string;
};

export type Trace = TraceData & {
  duration: IOtelTrace['duration'];
  endTime: IOtelTrace['endTime'];
  spans: ReadonlyArray<Span>;
  startTime: IOtelTrace['startTime'];
  traceName: string;
  tracePageTitle: string;
  traceEmoji: string;
  services: ReadonlyArray<{ name: string; numberOfSpans: number }>;
  // Number of orphan spans (spans referencing parent spans that don't exist in the trace)
  orphanSpanCount?: number;

  // Optimized data structures - created once during trace transformation
  spanMap: ReadonlyMap<string, Span>;
  rootSpans: ReadonlyArray<Span>;

  // OTEL facade - lazy-initialized and memoized
  _otelFacade?: IOtelTrace;
  asOtelTrace(): IOtelTrace;
};
