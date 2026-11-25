// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

export interface ISpecAttribute {
  key: string;
  value: string | number | boolean;
}

/**
 * A span spec describes identity, kind, parentage, timing, attributes, events, and scope under test.
 * The pipeline adds wire-format boilerplate when it materializes the spec. Timing defaults to 1
 * microsecond; explicit undefined omits either timing field, and explicit numeric values are preserved.
 */
interface ISpanSpec {
  spanID: string;
  name: string;
  /** OTLP span kind; omission exercises the UNSPECIFIED fallback. */
  kind?: 'unspecified' | 'internal' | 'server' | 'client' | 'producer' | 'consumer';
  status?: { code: 'unset' | 'ok' | 'error'; message?: string };
  /** This field identifies the parent; an omitted value means the spec declares no parent. */
  parentSpanID?: string;
  /** These links do not set parentage, and a link's trace ID defaults to the trace's. */
  links?: { spanID: string; traceID?: string; attributes?: ISpecAttribute[] }[];
  /** The span's service; defaults to the trace's serviceName. */
  serviceName?: string;
  startTime?: number;
  duration?: number;
  attributes?: ISpecAttribute[];
  events?: { name?: string; timestamp: number; attributes?: ISpecAttribute[] }[];
  scope?: { name?: string; version?: string };
  /** Backend diagnostics: the legacy `warnings` array, or the OTLP `@jaeger@warnings` attribute. */
  warnings?: string[];
}

export interface ITraceSpec {
  traceID: string;
  serviceName: string;
  /** Resource attributes shared by every service; the OTLP side adds service.name. */
  resourceAttributes?: ISpecAttribute[];
  spans: ISpanSpec[];
}
