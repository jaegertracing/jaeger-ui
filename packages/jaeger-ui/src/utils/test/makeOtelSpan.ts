// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { makeAttributes } from '../../model/attributes';
import { IOtelSpan, StatusCode } from '../../types/otel';

export function makeOtelSpan(overrides: Partial<IOtelSpan> = {}): IOtelSpan {
  const zero = 0 as IOtelSpan['startTime'];
  return {
    attributes: makeAttributes(),
    childSpans: [],
    depth: 0,
    duration: zero,
    endTime: zero,
    events: [],
    hasChildren: false,
    inboundLinks: [],
    instrumentationScope: { name: 'test' },
    kind: 'INTERNAL' as IOtelSpan['kind'],
    links: [],
    name: 'test',
    relativeStartTime: zero,
    resource: { attributes: makeAttributes(), serviceName: 'test' },
    spanID: 'span',
    startTime: zero,
    status: { code: StatusCode.OK },
    traceID: 'trace',
    warnings: null,
    ...overrides,
  };
}
