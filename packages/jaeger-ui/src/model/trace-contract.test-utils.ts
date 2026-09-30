// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { expect } from 'vitest';
import type { IOtelTrace, IOtelSpan, ILink } from '../types/otel';
import type { ITraceContractCase } from './trace-contract.fixtures';

export function assertSpanFields(
  span: IOtelSpan,
  fields: Partial<Pick<IOtelSpan, 'traceID' | 'spanID' | 'name'>> & {
    startTime?: number;
    endTime?: number;
    duration?: number;
  }
) {
  for (const [key, value] of Object.entries(fields)) {
    expect(span[key as keyof IOtelSpan]).toEqual(value);
  }
}

// Collection, depth and identity assertions extracted from the transformer and
// facade tests. Both pipelines must satisfy these independently of equality.

export function assertTraceIdentity(trace: IOtelTrace) {
  for (const root of trace.rootSpans) expect(root).toBe(trace.spanMap.get(root.spanID));
  const assertLink = (link: ILink) => {
    expect(link.span).toBe(link.traceID === trace.traceID ? trace.spanMap.get(link.spanID) : undefined);
  };
  for (const span of trace.spans) {
    expect(span).toBe(trace.spanMap.get(span.spanID));
    expect(span.parentSpan).toBe(span.parentSpanID ? trace.spanMap.get(span.parentSpanID) : undefined);
    expect(span.hasChildren).toBe(span.childSpans.length > 0);
    for (const child of span.childSpans) {
      expect(child).toBe(trace.spanMap.get(child.spanID));
      expect(child.parentSpan).toBe(span);
    }
    for (const link of span.links) assertLink(link);
    for (const link of span.inboundLinks) assertLink(link);
  }
}

export function assertTraceContract(trace: IOtelTrace, fixture: ITraceContractCase) {
  expect(trace.traceID).toBe(fixture.input.traceID);
  expect(trace.spans.map(span => span.spanID)).toEqual(fixture.order);
  expect(trace.spans.map(span => span.depth)).toEqual(fixture.depths);
  expect(trace.rootSpans.map(span => span.spanID)).toEqual(fixture.roots);
  expect(trace.orphanSpanCount).toBe(fixture.orphanCount);
  expect(trace.spanMap.size).toBe(fixture.order.length);
  assertTraceIdentity(trace);
}

// Explicit model projection, not a Vitest snapshot. Arrays remain ordered and
// cyclic pointers are represented by both their wire IDs and resolved IDs.
export function traceModelFields(trace: IOtelTrace) {
  const linkFields = (link: ILink) => ({
    traceID: link.traceID,
    spanID: link.spanID,
    resolvedSpanID: link.span?.spanID,
    attributes: [...link.attributes.entries()],
  });
  return {
    traceID: trace.traceID,
    startTime: trace.startTime,
    endTime: trace.endTime,
    duration: trace.duration,
    traceName: trace.traceName,
    tracePageTitle: trace.tracePageTitle,
    traceEmoji: trace.traceEmoji,
    services: trace.services,
    orphanSpanCount: trace.orphanSpanCount,
    isGenAITrace: trace.isGenAITrace,
    hasErrors: trace.hasErrors(),
    roots: trace.rootSpans.map(span => span.spanID),
    spanMapIDs: [...trace.spanMap.keys()].sort(),
    spans: trace.spans.map(span => ({
      traceID: span.traceID,
      spanID: span.spanID,
      parentSpanID: span.parentSpanID,
      resolvedParentID: span.parentSpan?.spanID,
      name: span.name,
      kind: span.kind,
      genAIKind: span.genAIKind,
      startTime: span.startTime,
      endTime: span.endTime,
      duration: span.duration,
      relativeStartTime: span.relativeStartTime,
      depth: span.depth,
      hasChildren: span.hasChildren,
      children: span.childSpans.map(child => child.spanID),
      attributes: [...span.attributes.entries()],
      events: span.events.map(event => ({
        timestamp: event.timestamp,
        name: event.name,
        attributes: [...event.attributes.entries()],
      })),
      status: span.status,
      resource: {
        serviceName: span.resource.serviceName,
        attributes: [...span.resource.attributes.entries()],
      },
      instrumentationScope: {
        name: span.instrumentationScope.name,
        version: span.instrumentationScope.version,
        attributes: [...(span.instrumentationScope.attributes?.entries() ?? [])],
      },
      links: span.links.map(linkFields),
      inboundLinks: span.inboundLinks.map(linkFields),
      warnings: span.warnings ?? [],
    })),
  };
}
