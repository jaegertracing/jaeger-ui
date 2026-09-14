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
  readonly isGenAITrace: boolean;

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

    // Each span's genAIKind is already computed once in OtelSpanFacade's
    // constructor, so this reads cached values instead of re-scanning attributes.
    this.isGenAITrace = this._spans.some(s => s.genAIKind !== undefined);

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

  get tracePageTitle(): string {
    return this.legacyTrace.tracePageTitle;
  }

  get traceEmoji(): string {
    return this.legacyTrace.traceEmoji;
  }

  get services(): ReadonlyArray<{ name: string; numberOfSpans: number }> {
    return this.legacyTrace.services;
  }

  get orphanSpanCount(): number {
    // transformTraceData already counts this while resolving the same parent/child tree
    // that childSpans/parentSpan are built from below, so it's the authoritative count -
    // recomputing it independently from parentSpanID would now always read 0, since
    // parentSpanID is only ever set to a spanID that resolution already found in this trace.
    return this.legacyTrace.orphanSpanCount ?? 0;
  }

  hasErrors(): boolean {
    return this._spans.some(sp => sp.status.code === 'ERROR');
  }

  // Escape hatch for code that still requires the legacy Jaeger Trace shape.
  // Use sparingly; prefer IOtelTrace fields where possible.
  toLegacyTrace(): Trace {
    return this.legacyTrace;
  }
}
