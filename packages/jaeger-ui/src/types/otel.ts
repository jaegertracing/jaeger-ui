// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { Microseconds } from './units';

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
  timestamp: Microseconds;
  name: string;
  attributes: IAttribute[];
}

export interface ILink {
  traceID: string;
  spanID: string;
  attributes: IAttribute[];
  span?: IOtelSpan;
}

export interface IStatus {
  code: StatusCode;
  message?: string;
}

export interface IOtelSpan {
  // Identity
  traceID: string;
  spanID: string;
  parentSpanID?: string;
  parentSpan?: IOtelSpan;

  // Naming & Classification
  name: string;
  kind: SpanKind;

  // Timing
  startTime: Microseconds;
  endTime: Microseconds;
  duration: Microseconds;

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
  relativeStartTime: Microseconds; // microseconds since trace start

  // Inverse links to spans that reference this span via their outbound Links
  inboundLinks: ILink[];

  warnings: ReadonlyArray<string> | null;
}

export interface IOtelTrace {
  traceID: string;
  spans: ReadonlyArray<IOtelSpan>;

  // Some trace-level convenience properties
  duration: Microseconds;
  startTime: Microseconds;
  endTime: Microseconds;
  traceName: string;
  services: ReadonlyArray<{ name: string; numberOfSpans: number }>;

  // Optimized data structures - created once during trace transformation
  spanMap: ReadonlyMap<string, IOtelSpan>;
  rootSpans: ReadonlyArray<IOtelSpan>;

  // Number of orphan spans (spans with parent references to spans not in the trace)
  orphanSpanCount: number;

  // Helper methods
  hasErrors(): boolean;
}
