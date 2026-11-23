// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * A span spec describes identity, kind, parentage, timing, attributes, events, and scope under test.
 * The pipeline adds wire-format boilerplate (process and the traceID on every reference)
 * when it materializes the spec. Timing defaults to 1 microsecond;
 * explicit undefined omits either timing field, and explicit numeric values are preserved.
 */
interface ISpanSpec {
  spanID: string;
  name: string;
  /** OTLP span kind number; omission exercises the UNSPECIFIED fallback. */
  kind?: number;
  /** This field identifies the parent; an omitted value means the spec declares no parent. */
  parentSpanID?: string;
  /** These links do not set parentage, even when refType is CHILD_OF. */
  links?: { refType: 'CHILD_OF' | 'FOLLOWS_FROM'; spanID: string }[];
  startTime?: number;
  duration?: number;
  attributes?: { key: string; value: string | number | boolean }[];
  events?: {
    name?: string;
    timestamp: number;
    attributes?: { key: string; value: string | number | boolean }[];
  }[];
  scope?: { name?: string; version?: string };
  /** Backend diagnostics: the legacy `warnings` array, or the OTLP `@jaeger@warnings` attribute. */
  warnings?: string[];
}

export interface ITraceSpec {
  traceID: string;
  serviceName: string;
  spans: ISpanSpec[];
}
