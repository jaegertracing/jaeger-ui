// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { Trace } from '../types/trace';
import { IOtelTrace, IOtelSpan } from '../types/otel';
import OtelSpanFacade from './OtelSpanFacade';

export default class OtelTraceFacade implements IOtelTrace {
  private legacyTrace: Trace;
  private _spans: IOtelSpan[];
  private _spanMap: Map<string, IOtelSpan>;
  private _rootSpans: IOtelSpan[];
  private _orphanSpanCount: number;

  constructor(legacyTrace: Trace) {
    this.legacyTrace = legacyTrace;

    // Pre-compute spans
    this._spans = this.legacyTrace.spans.map(s => new OtelSpanFacade(s));

    // Build spanMap
    this._spanMap = new Map();
    this._spans.forEach(span => {
      this._spanMap.set(span.spanID, span);
    });

    // Build rootSpans from legacy trace rootSpans
    this._rootSpans = this.legacyTrace.rootSpans.map(s => {
      const otelSpan = this._spanMap.get(s.spanID);
      if (!otelSpan) throw new Error(`Root span ${s.spanID} not found in spanMap`);
      return otelSpan;
    });

    // Calculate orphan span count
    // A span is orphaned if it has a parentSpanID but the parent is not in the trace
    this._orphanSpanCount = this._spans.filter(
      s => s.parentSpanID && !this._spanMap.has(s.parentSpanID)
    ).length;

    // Wire up parentSpan, childSpans, and link span references
    this._spans.forEach(span => {
      const facade = span as OtelSpanFacade;
      if (facade.parentSpanID) {
        facade.parentSpan = this._spanMap.get(facade.parentSpanID);
      }

      // Populate childSpans using legacySpan.childSpans
      const legacySpan = (facade as any).legacySpan;
      if (legacySpan && legacySpan.childSpans) {
        facade.childSpans = legacySpan.childSpans
          .map((s: any) => this._spanMap.get(s.spanID))
          .filter(Boolean);
      }

      // Wire up links
      facade.links.forEach(link => {
        link.span = this._spanMap.get(link.spanID);
      });

      // Wire up inboundLinks
      facade.inboundLinks.forEach(link => {
        link.span = this._spanMap.get(link.spanID);
      });
    });
  }

  get traceID(): string {
    return this.legacyTrace.traceID;
  }

  get spans(): IOtelSpan[] {
    return this._spans;
  }

  get spanMap(): Map<string, IOtelSpan> {
    return this._spanMap;
  }

  get rootSpans(): IOtelSpan[] {
    return this._rootSpans;
  }

  get duration(): IOtelTrace['duration'] {
    return this.legacyTrace.duration as IOtelTrace['duration'];
  }

  get startTime(): IOtelTrace['startTime'] {
    return this.legacyTrace.startTime as IOtelTrace['startTime'];
  }

  get endTime(): IOtelTrace['endTime'] {
    return this.legacyTrace.endTime as IOtelTrace['endTime'];
  }

  get traceName(): string {
    return this.legacyTrace.traceName;
  }

  get services(): ReadonlyArray<{ name: string; numberOfSpans: number }> {
    return this.legacyTrace.services;
  }

  get orphanSpanCount(): number {
    return this._orphanSpanCount;
  }

  hasErrors(): boolean {
    return this._spans.some(sp => sp.status.code === 'ERROR');
  }
}
