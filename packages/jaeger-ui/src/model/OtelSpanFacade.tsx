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

export default class OtelSpanFacade implements IOtelSpan {
  private legacySpan: Span;
  private _kind: SpanKind;
  private _parentSpanId: string | undefined;
  private _attributes: IAttribute[];
  private _events: IEvent[];
  private _links: ILink[];
  private _status: IStatus;
  private _resource: IResource;

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

    const parentRef = this.legacySpan.references.find(ref => ref.refType === 'CHILD_OF');
    this._parentSpanId = parentRef ? parentRef.spanID : undefined;

    this._attributes = OtelSpanFacade.toOtelAttributes(this.legacySpan.tags);

    this._events = this.legacySpan.logs.map(log => ({
      timeUnixMicro: log.timestamp,
      name: (log.fields.find(f => f.key === 'event')?.value as string) || 'log',
      attributes: OtelSpanFacade.toOtelAttributes(log.fields),
    }));

    this._links = this.legacySpan.references
      .filter(ref => ref.refType !== 'CHILD_OF')
      .map(ref => ({
        traceId: ref.traceID,
        spanId: ref.spanID,
        attributes: [], // Legacy references don't have attributes
      }));

    const errorTag = this.legacySpan.tags.find(t => t.key === 'error');
    this._status =
      errorTag && errorTag.value ? { code: StatusCode.ERROR, message: 'error' } : { code: StatusCode.OK };

    this._resource = {
      attributes: OtelSpanFacade.toOtelAttributes(this.legacySpan.process.tags),
      serviceName: this.legacySpan.process.serviceName,
    };
  }

  private static toOtelAttributes(tags: { key: string; value: any }[]): IAttribute[] {
    return tags
      .filter(kv => kv.value !== null && kv.value !== undefined)
      .map(kv => ({
        key: kv.key,
        value: kv.value as AttributeValue,
      }));
  }

  get traceId(): string {
    return this.legacySpan.traceID;
  }

  get spanId(): string {
    return this.legacySpan.spanID;
  }

  get parentSpanId(): string | undefined {
    return this._parentSpanId;
  }

  get name(): string {
    return this.legacySpan.operationName;
  }

  get kind(): SpanKind {
    return this._kind;
  }

  get startTimeUnixMicros(): number {
    return this.legacySpan.startTime;
  }

  get endTimeUnixMicros(): number {
    return this.legacySpan.startTime + this.legacySpan.duration;
  }

  get durationMicros(): number {
    return this.legacySpan.duration;
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
    return this.legacySpan.hasChildren;
  }

  get relativeStartTimeMicros(): number {
    return this.legacySpan.relativeStartTime;
  }

  get childSpanIds(): string[] {
    return this.legacySpan.childSpanIds;
  }

  get subsidiarilyReferencedBy(): ILink[] {
    return this.legacySpan.subsidiarilyReferencedBy.map(ref => ({
      traceId: ref.traceID,
      spanId: ref.spanID,
      attributes: [],
    }));
  }
}
