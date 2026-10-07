// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * A span spec describes identity, parentage, timing, kind, scope, events, and attributes under test.
 * The pipeline adds wire-format boilerplate (process and the traceID
 * on every reference) when it materializes the spec. Timing defaults to 1 microsecond;
 * explicit undefined omits either timing field, and explicit numeric values are preserved.
 */
interface ISpanSpec {
  spanID: string;
  operationName: string;
  /** OTLP span kind number; omission exercises the UNSPECIFIED fallback. */
  kind?: number;
  scope?: { name?: string; version?: string };
  events?: {
    name?: string;
    timestamp: number;
    attributes?: { key: string; value: string | number | boolean }[];
  }[];
  /** This field identifies the parent; an omitted value means the spec declares no parent. */
  parentSpanID?: string;
  /** These references describe links, not parentage, even when refType is CHILD_OF. */
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
