// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

export enum SpanKind {
  INTERNAL = 'INTERNAL',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  PRODUCER = 'PRODUCER',
  CONSUMER = 'CONSUMER',
}

export enum StatusCode {
  UNSET = 'UNSET',
  OK = 'OK',
  ERROR = 'ERROR',
}

export type AttributeValue =
  | string
  | number
  | boolean
  | Array<AttributeValue>
  | { [key: string]: AttributeValue }
  | Uint8Array;

export interface IAttribute {
  key: string;
  value: AttributeValue;
}

export interface IResource {
  attributes: IAttribute[]; // includes service.name, etc.
  serviceName: string; // convenience: attributes['service.name']
}

export interface IScope {
  name: string;
  version?: string;
  attributes?: IAttribute[];
}

export interface IEvent {
  timeUnixMicro: number;
  name: string;
  attributes: IAttribute[];
}

export interface ILink {
  traceId: string;
  spanId: string;
  attributes: IAttribute[];
  span?: IOtelSpan;
}

export interface IStatus {
  code: StatusCode;
  message?: string;
}

export interface IOtelSpan {
  // Identity
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  parentSpan?: IOtelSpan;

  // Naming & Classification
  name: string;
  kind: SpanKind;

  // Timing
  startTimeUnixMicros: number;
  endTimeUnixMicros: number;
  durationMicros: number;

  // Core Data
  attributes: IAttribute[];
  events: IEvent[];
  links: ILink[];
  status: IStatus;

  // Context
  resource: IResource;
  instrumentationScope: IScope;

  // Derived properties
  depth: number;
  hasChildren: boolean;
  childSpans: ReadonlyArray<IOtelSpan>;
  relativeStartTimeMicros: number; // microseconds since trace start
  subsidiarilyReferencedBy: ILink[]; // spans that reference this span via links (not parent-child)

  warnings: ReadonlyArray<string> | null;
}

export interface IOtelTrace {
  traceId: string;
  spans: ReadonlyArray<IOtelSpan>;

  // Some trace-level convenience properties
  durationMicros: number;
  startTimeUnixMicros: number;
  endTimeUnixMicros: number;
  traceName: string;
  services: ReadonlyArray<{ name: string; numberOfSpans: number }>;

  // Optimized data structures - created once during trace transformation
  spanMap: ReadonlyMap<string, IOtelSpan>;
  rootSpans: ReadonlyArray<IOtelSpan>;
}
