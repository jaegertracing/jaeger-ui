// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';

import { SERVICES_QUERY_KEY, spanNamesQueryKey, TRACE_SUMMARIES_QUERY_KEY } from './traceDiscoveryQueryKeys';

describe('traceDiscoveryQueryKeys', () => {
  it('SERVICES_QUERY_KEY is stable', () => {
    expect(SERVICES_QUERY_KEY).toEqual(['services']);
  });

  it('TRACE_SUMMARIES_QUERY_KEY is stable', () => {
    expect(TRACE_SUMMARIES_QUERY_KEY).toEqual(['traceSummaries']);
  });

  it('spanNamesQueryKey includes the service parameter', () => {
    expect(spanNamesQueryKey('my-svc')).toEqual(['spanNames', 'my-svc']);
    expect(spanNamesQueryKey(null)).toEqual(['spanNames', null]);
  });
});
