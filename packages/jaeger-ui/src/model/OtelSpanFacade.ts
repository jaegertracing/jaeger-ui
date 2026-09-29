// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { Span } from '../types/trace';
import {
  IOtelSpan,
  IAttribute,
  IAttributes,
  AttributeValue,
  IEvent,
  ILink,
  IStatus,
  StatusCode,
  SpanKind,
  GenAISpanKind,
  IResource,
  IScope,
} from '../types/otel';
import { classifySpan } from '../utils/genai/detect';
import { makeAttributes } from './attributes';

export default class OtelSpanFacade implements IOtelSpan {
  private legacySpan: Span;
  private _kind: SpanKind;
  private _parentSpanID: string | undefined;
  private _attributes: IAttributes;
  private _genAIKind: GenAISpanKind | undefined;
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

    // The tree parent is already resolved once, authoritatively, by transformTraceData - the
    // same resolution that builds childSpans/rootSpans - and stored on the legacy span as
    // `parentID`. Re-deriving it here independently (e.g. preferring CHILD_OF over
    // FOLLOWS_FROM regardless of reference order, without checking the target actually
    // exists in this trace) could disagree with that tree: a span's parentSpan would then
    // not actually list it in parentSpan.childSpans.
    // See https://github.com/jaegertracing/jaeger-ui/issues/4460.
    const { references } = this.legacySpan;
    this._parentSpanID = this.legacySpan.parentID;

    this._attributes = makeAttributes(OtelSpanFacade.toOtelAttributes(this.legacySpan.tags));
    this._genAIKind = classifySpan({ attributes: this._attributes });

    this._events = this.legacySpan.logs.map(log => ({
      timestamp: log.timestamp as IEvent['timestamp'],
      name: (log.fields.find(f => f.key === 'event')?.value as string) || 'log',
      attributes: makeAttributes(OtelSpanFacade.toOtelAttributes(log.fields)),
    }));

    // Links are every reference except the one used as the tree parent above. Find that one
    // reference the same way transformTraceData did (first CHILD_OF/FOLLOWS_FROM reference
    // targeting parentID) rather than by object identity, since parentID is now the only
    // thing carried over from that resolution.
    let parentRefExcluded = this._parentSpanID === undefined;
    this._links = references
      .filter(ref => {
        if (
          !parentRefExcluded &&
          (ref.refType === 'CHILD_OF' || ref.refType === 'FOLLOWS_FROM') &&
          ref.spanID === this._parentSpanID
        ) {
          parentRefExcluded = true;
          return false;
        }
        return true;
      })
      .map(ref => ({
        traceID: ref.traceID,
        spanID: ref.spanID,
        attributes: makeAttributes(), // Legacy references don't have attributes
      }));

    const errorTag = this.legacySpan.tags.find(t => t.key === 'error');
    this._status =
      errorTag && errorTag.value ? { code: StatusCode.ERROR, message: 'error' } : { code: StatusCode.OK };

    const process = this.legacySpan.process;
    this._resource = {
      attributes: makeAttributes(process ? OtelSpanFacade.toOtelAttributes(process.tags) : []),
      serviceName: process ? process.serviceName : 'unknown-service',
    };

    this._inboundLinks = this.legacySpan.subsidiarilyReferencedBy.map(ref => ({
      traceID: ref.traceID,
      spanID: ref.spanID,
      attributes: makeAttributes(),
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

  get genAIKind(): GenAISpanKind | undefined {
    return this._genAIKind;
  }

  get startTime(): IOtelSpan['startTime'] {
    return this.legacySpan.startTime as IOtelSpan['startTime'];
  }

  get endTime(): IOtelSpan['endTime'] {
    return (this.legacySpan.startTime + this.legacySpan.duration) as IOtelSpan['endTime'];
  }

  get duration(): IOtelSpan['duration'] {
    return this.legacySpan.duration as IOtelSpan['duration'];
  }

  get attributes(): IAttributes {
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

  get relativeStartTime(): IOtelSpan['relativeStartTime'] {
    return this.legacySpan.relativeStartTime as IOtelSpan['relativeStartTime'];
  }

  get inboundLinks(): ILink[] {
    return this._inboundLinks;
  }

  // Legacy Jaeger-specific properties for UI compatibility
  get warnings(): ReadonlyArray<string> | null {
    return this.legacySpan.warnings;
  }
}
