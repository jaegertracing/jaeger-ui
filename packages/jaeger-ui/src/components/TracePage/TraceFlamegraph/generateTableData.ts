// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0
//
// Adapted from @pyroscope/flamegraph v0.35.6 (Apache-2.0)
// Copyright (c) 2020 Pyroscope, Inc.

// Aggregates spans by "service: operation", showing the longest span's
// self-time and duration as the representative values for each group.

import { IOtelTrace, IOtelSpan } from '../../../types/otel';

export interface IFlamegraphTableRow {
  key: string;
  serviceName: string;
  name: string;
  count: number;
  self: number;
  total: number;
}

export function generateTableData(trace: IOtelTrace): IFlamegraphTableRow[] {
  const groups = new Map<string, IFlamegraphTableRow>();

  for (const span of trace.spans) {
    const name = `${span.resource.serviceName}: ${span.name}`;
    const self = computeSelfTime(span);

    const existing = groups.get(name);
    if (existing) {
      existing.count += 1;
      if (span.duration > existing.total) {
        existing.self = self;
        existing.total = span.duration;
      }
    } else {
      groups.set(name, {
        key: name,
        serviceName: span.resource.serviceName,
        name,
        count: 1,
        self,
        total: span.duration,
      });
    }
  }

  return Array.from(groups.values());
}

function computeSelfTime(span: IOtelSpan): number {
  if (!span.hasChildren) return span.duration;

  let selfTime: number = span.duration;
  let previousChildEndTime = span.startTime;

  const children = [...span.childSpans].sort((a, b) => a.startTime - b.startTime);
  const parentEndTime = span.endTime;

  for (const child of children) {
    const childEndTime = child.endTime;
    if (child.startTime > parentEndTime || childEndTime < previousChildEndTime) {
      continue;
    }

    const nonOverlappingStart = Math.max(previousChildEndTime, child.startTime);
    const clampedEnd = Math.min(parentEndTime, childEndTime);
    selfTime -= clampedEnd - nonOverlappingStart;

    if (clampedEnd === parentEndTime) break;
    previousChildEndTime = childEndTime;
  }

  return Math.max(0, selfTime);
}
