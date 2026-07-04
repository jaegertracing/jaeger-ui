// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0
//
// Adapted from @pyroscope/flamegraph v0.35.6 (Apache-2.0)
// Copyright (c) 2020 Pyroscope, Inc.

// Aggregates spans by "service: operation", summing self-time and duration
// across all spans in each group to show total resource cost.

import { IOtelTrace } from '../../../types/otel';
import computeSpanSelfTime from '../../../utils/compute-span-self-time';

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
    const self = computeSpanSelfTime(span);

    const existing = groups.get(name);
    if (existing) {
      existing.count += 1;
      existing.self += self;
      existing.total += span.duration;
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
