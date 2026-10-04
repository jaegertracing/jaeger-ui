// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * A span spec describes identity, parentage, timing, and attributes under test.
 * Shared cases specify parentage with parentSpanID and use references only for additional links.
 * The pipeline adds wire-format boilerplate (process, empty logs, and the traceID
 * on every reference) when it materializes the spec. Timing defaults to 1 microsecond;
 * explicit undefined omits either timing field, and explicit numeric values are preserved.
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
