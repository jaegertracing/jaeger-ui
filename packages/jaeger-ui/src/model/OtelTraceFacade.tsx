// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { Trace } from '../types/trace';
import { IOtelTrace, IOtelSpan } from '../types/otel';
import OtelSpanFacade from './OtelSpanFacade';

export default class OtelTraceFacade implements IOtelTrace {
  private legacyTrace: Trace;
  private _spans: IOtelSpan[];

  constructor(legacyTrace: Trace) {
    this.legacyTrace = legacyTrace;

    // Pre-compute spans
    this._spans = this.legacyTrace.spans.map(s => new OtelSpanFacade(s));
  }

  get traceId(): string {
    return this.legacyTrace.traceID;
  }

  get spans(): IOtelSpan[] {
    return this._spans;
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
