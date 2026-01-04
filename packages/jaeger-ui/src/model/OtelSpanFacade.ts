// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { Span } from '../types/trace';
import {
  IOtelSpan,
  IAttribute,
  AttributeValue,
  IEvent,
  ILink,
  IStatus,
  StatusCode,
  SpanKind,
  IResource,
  IScope,
} from '../types/otel';
import { Microseconds } from '../types/units';

export default class OtelSpanFacade implements IOtelSpan {
  private legacySpan: Span;
  private _kind: SpanKind;
  private _parentSpanID: string | undefined;
  private _attributes: IAttribute[];
  private _events: IEvent[];
  private _links: ILink[];
  private _status: IStatus;
  private _resource: IResource;
  private _inboundLinks: ILink[];
  private _childSpans: ReadonlyArray<IOtelSpan> = [];
  private _parentSpan?: IOtelSpan;

  constructor(legacySpan: Span) {
    this.legacySpan = legacySpan;

    // Pre-compute expensive fields
    const kindTag = this.legacySpan.tags.find(t => t.key === 'span.kind');
    this._kind = SpanKind.INTERNAL;
    if (kindTag) {
      const val = String(kindTag.value).toUpperCase();
      if (val in SpanKind) {
        this._kind = SpanKind[val as keyof typeof SpanKind];
      }
    }

    // Find parent span ID according to the following priority:
    // 1. Earliest CHILD_OF reference with the same traceID
    // 2. Otherwise, earliest FOLLOWS_FROM reference with the same traceID
    // 3. If no reference with same traceID exists, parent is undefined
    const { references, traceID } = this.legacySpan;
    const parentSpanRef =
      references.find(r => r.traceID === traceID && r.refType === 'CHILD_OF') ??
      references.find(r => r.traceID === traceID && r.refType === 'FOLLOWS_FROM');
    this._parentSpanID = parentSpanRef?.spanID;

    this._attributes = OtelSpanFacade.toOtelAttributes(this.legacySpan.tags);

    this._events = this.legacySpan.logs.map(log => ({
      timestamp: log.timestamp as Microseconds,
      name: (log.fields.find(f => f.key === 'event')?.value as string) || 'log',
      attributes: OtelSpanFacade.toOtelAttributes(log.fields),
    }));

    this._links = this.legacySpan.references
      .filter(ref => ref !== parentSpanRef)
      .map(ref => ({
        traceID: ref.traceID,
        spanID: ref.spanID,
        attributes: [], // Legacy references don't have attributes
      }));

    const errorTag = this.legacySpan.tags.find(t => t.key === 'error');
    this._status =
      errorTag && errorTag.value ? { code: StatusCode.ERROR, message: 'error' } : { code: StatusCode.OK };

    const process = this.legacySpan.process;
    this._resource = {
      attributes: process ? OtelSpanFacade.toOtelAttributes(process.tags) : [],
      serviceName: process ? process.serviceName : 'unknown-service',
    };

    this._inboundLinks = this.legacySpan.subsidiarilyReferencedBy.map(ref => ({
      traceID: ref.traceID,
      spanID: ref.spanID,
      attributes: [],
    }));
  }

  private static toOtelAttributes(tags: ReadonlyArray<{ key: string; value: any }>): IAttribute[] {
    return tags
      .filter(kv => kv.value !== null && kv.value !== undefined)
      .map(kv => ({
        key: kv.key,
        value: kv.value as AttributeValue,
      }));
  }

  get traceID(): string {
    return this.legacySpan.traceID;
  }

  get spanID(): string {
    return this.legacySpan.spanID;
  }

  get parentSpanID(): string | undefined {
    return this._parentSpanID;
  }

  get name(): string {
    return this.legacySpan.operationName;
  }

  get kind(): SpanKind {
    return this._kind;
  }

  get startTime(): Microseconds {
    return this.legacySpan.startTime as Microseconds;
  }

  get endTime(): Microseconds {
    return (this.legacySpan.startTime + this.legacySpan.duration) as Microseconds;
  }

  get duration(): Microseconds {
    return this.legacySpan.duration as Microseconds;
  }

  get attributes(): IAttribute[] {
    return this._attributes;
  }

  get events(): IEvent[] {
    return this._events;
  }

  get links(): ILink[] {
    return this._links;
  }

  get status(): IStatus {
    return this._status;
  }

  get resource(): IResource {
    return this._resource;
  }

  get parentSpan(): IOtelSpan | undefined {
    return this._parentSpan;
  }

  set parentSpan(value: IOtelSpan | undefined) {
    this._parentSpan = value;
  }

  get instrumentationScope(): IScope {
    // Legacy Jaeger doesn't have explicit instrumentation scope,
    // but we can look for it in tags if it was mapped there by exporters.
    const name =
      (this.legacySpan.tags.find(t => t.key === 'otel.library.name')?.value as string) || 'unknown';
    const version = this.legacySpan.tags.find(t => t.key === 'otel.library.version')?.value as string;
    return { name, version };
  }

  get depth(): number {
    return this.legacySpan.depth;
  }

  get hasChildren(): boolean {
    return this._childSpans.length > 0;
  }

  get childSpans(): ReadonlyArray<IOtelSpan> {
    return this._childSpans;
  }

  set childSpans(value: ReadonlyArray<IOtelSpan>) {
    this._childSpans = value;
  }

  get relativeStartTime(): Microseconds {
    return this.legacySpan.relativeStartTime as Microseconds;
  }

  get inboundLinks(): ILink[] {
    return this._inboundLinks;
  }

  // Legacy Jaeger-specific properties for UI compatibility
  get warnings(): ReadonlyArray<string> | null {
    return this.legacySpan.warnings;
  }
}
