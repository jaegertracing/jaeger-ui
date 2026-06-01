// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { StatusCode } from '../types/otel';
import type { IOtelTrace } from '../types/otel';
import type { ServiceSummary, TraceSummary } from '../types/trace-summary';

export function traceToTraceSummary(trace: IOtelTrace): TraceSummary {
  const rootSpan = trace.rootSpans[0];
  const rootServiceName = rootSpan?.resource.serviceName ?? '';
  const rootOperationName = rootSpan?.name ?? '';

  const errorsByService = new Map<string, number>();
  let errorSpanCount = 0;
  for (const span of trace.spans) {
    if (span.status.code === StatusCode.ERROR) {
      errorSpanCount++;
      const svc = span.resource.serviceName;
      errorsByService.set(svc, (errorsByService.get(svc) ?? 0) + 1);
    }
  }

  const services: ServiceSummary[] = trace.services.map(s => ({
    name: s.name,
    spanCount: s.numberOfSpans,
    errorSpanCount: errorsByService.get(s.name) ?? 0,
  }));

  return {
    traceID: trace.traceID,
    traceName: trace.traceName,
    rootServiceName,
    rootOperationName,
    startTime: trace.startTime,
    duration: trace.duration,
    spanCount: trace.spans.length,
    errorSpanCount,
    orphanSpanCount: trace.orphanSpanCount,
    services,
    serviceSummariesSupported: true,
    errorSpanCountSupported: true,
  };
}
