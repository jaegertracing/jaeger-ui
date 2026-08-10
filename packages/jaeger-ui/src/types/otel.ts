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

export type GenAISpanKind = 'LLM_CALL' | 'TOOL_CALL' | 'AGENT' | 'RETRIEVAL' | 'UNKNOWN_GENAI';

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

/**
 * A collection of attributes that hides the underlying array so that looking
 * up a specific attribute is an O(1) `getValue(key)` rather than a linear
 * `.find(a => a.key === key)` scan. Used everywhere OTel attributes are stored
 * (span, resource, scope, event, link). Construct via `makeAttributes()` in
 * `model/attributes.ts`.
 */
export interface IAttributes {
  /** Value of the first attribute with the given key, or undefined if absent. O(1). */
  getValue(key: string): AttributeValue | undefined;

  /** True if any attribute has the given key. O(1). */
  has(key: string): boolean;

  /** Unique attribute keys, for prefix/namespace scans and key collection. */
  keys(): ReadonlyArray<string>;

  /**
   * DO NOT USE THIS UNLESS YOU REALLY NEED TO PROCESS THE WHOLE COLLECTION
   * (e.g. rendering every attribute or a full-text search). To look up a
   * specific attribute by key, use getValue()/has() — they are O(1). Calling
   * .find()/.filter() on the result of entries() re-introduces the exact
   * linear-scan footgun this type exists to remove.
   */
  entries(): ReadonlyArray<IAttribute>;

  /** Total number of attributes (counting duplicate keys). */
  readonly size: number;
}

export interface IResource {
  attributes: IAttributes; // includes service.name, etc.
  serviceName: string; // convenience: attributes.getValue('service.name')
}

export interface IScope {
  name: string;
  version?: string;
  attributes?: IAttributes;
}

export interface IEvent {
  timestamp: Microseconds;
  name: string;
  attributes: IAttributes;
}

export interface ILink {
  traceID: string;
  spanID: string;
  attributes: IAttributes;
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
  // undefined when the span carries no gen_ai.* attributes.
  genAIKind?: GenAISpanKind;

  // Timing
  startTime: Microseconds;
  endTime: Microseconds;
  duration: Microseconds;

  // Core Data
  attributes: IAttributes;
  events: IEvent[];
  links: ILink[];
  status: IStatus;

  // Context
  resource: IResource;
  instrumentationScope: IScope;

  // Derived properties
  depth: number;
  hasChildren: boolean;
  // Sorted by startTime (ascending).
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
  tracePageTitle: string;
  traceEmoji: string;
  services: ReadonlyArray<{ name: string; numberOfSpans: number }>;

  // Optimized data structures - created once during trace transformation
  spanMap: ReadonlyMap<string, IOtelSpan>;
  rootSpans: ReadonlyArray<IOtelSpan>;

  // Number of orphan spans (spans with parent references to spans not in the trace)
  orphanSpanCount: number;

  // True if any span in the trace carries a gen_ai.* attribute
  isGenAITrace: boolean;

  // Helper methods
  hasErrors(): boolean;
}
