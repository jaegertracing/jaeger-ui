// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * A span spec describes identity, parentage, timing, and attributes under test.
 * The pipeline adds wire-format boilerplate (process, empty logs, and the traceID
 * on every reference) when it materializes the spec. Timing defaults to 1 microsecond;
 * an explicit startTime of undefined, 0, or NaN exercises timestamp repair.
 */
interface ISpanSpec {
  spanID: string;
  operationName: string;
  parentSpanID?: string;
  references?: { refType: 'CHILD_OF' | 'FOLLOWS_FROM'; spanID: string }[];
  startTime?: number;
  duration?: number;
  tags?: { key: string; value: string | number | boolean }[];
}

export interface ITraceSpec {
  traceID: string;
  serviceName: string;
  spans: ISpanSpec[];
}
