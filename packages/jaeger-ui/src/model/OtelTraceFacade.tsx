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

  constructor(legacyTrace: Trace) {
    this.legacyTrace = legacyTrace;

    // Pre-compute spans
    this._spans = this.legacyTrace.spans.map(s => new OtelSpanFacade(s));

    // Build spanMap
    this._spanMap = new Map();
    this._spans.forEach(span => {
      this._spanMap.set(span.spanId, span);
    });

    // Build rootSpans from legacy trace rootSpans
    this._rootSpans = this.legacyTrace.rootSpans.map(s => {
      const otelSpan = this._spanMap.get(s.spanID);
      if (!otelSpan) throw new Error(`Root span ${s.spanID} not found in spanMap`);
      return otelSpan;
    });
  }

  get traceId(): string {
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

  get durationMicros(): number {
    return this.legacyTrace.duration;
  }

  get startTimeUnixMicros(): number {
    return this.legacyTrace.startTime;
  }

  get endTimeUnixMicros(): number {
    return this.legacyTrace.endTime;
  }

  get traceName(): string {
    return this.legacyTrace.traceName;
  }

  get services(): { name: string; numberOfSpans: number }[] {
    return this.legacyTrace.services;
  }
}
