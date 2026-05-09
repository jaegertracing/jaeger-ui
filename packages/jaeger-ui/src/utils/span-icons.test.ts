// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IoSparkles, IoServer, IoGlobe, IoChatbubble, IoCodeSlash } from 'react-icons/io5';
import { getSpanTypeIcon } from './span-icons';
import { IOtelSpan, SpanKind, StatusCode } from '../types/otel';

function makeSpan(attrKeys: string[]): IOtelSpan {
  return {
    traceID: 't1',
    spanID: 's1',
    name: 'op',
    kind: SpanKind.INTERNAL,
    startTime: 0 as IOtelSpan['startTime'],
    endTime: 0 as IOtelSpan['endTime'],
    duration: 0 as IOtelSpan['duration'],
    attributes: attrKeys.map(key => ({ key, value: 'test' })),
    events: [],
    links: [],
    inboundLinks: [],
    status: { code: StatusCode.UNSET },
    resource: { attributes: [], serviceName: 'svc' },
    instrumentationScope: { name: 'scope' },
    depth: 0,
    hasChildren: false,
    childSpans: [],
    relativeStartTime: 0 as IOtelSpan['relativeStartTime'],
    warnings: null,
  };
}

describe('getSpanTypeIcon', () => {
  it('returns IoSparkles for gen_ai attributes', () => {
    expect(getSpanTypeIcon(makeSpan(['gen_ai.system']))).toBe(IoSparkles);
  });

  it('returns IoServer for db attributes', () => {
    expect(getSpanTypeIcon(makeSpan(['db.system']))).toBe(IoServer);
  });

  it('returns IoGlobe for http attributes', () => {
    expect(getSpanTypeIcon(makeSpan(['http.method']))).toBe(IoGlobe);
  });

  it('returns IoChatbubble for messaging attributes', () => {
    expect(getSpanTypeIcon(makeSpan(['messaging.system']))).toBe(IoChatbubble);
  });

  it('returns IoCodeSlash for rpc attributes', () => {
    expect(getSpanTypeIcon(makeSpan(['rpc.system']))).toBe(IoCodeSlash);
  });

  it('returns null for spans with no recognized attributes', () => {
    expect(getSpanTypeIcon(makeSpan(['custom.attr']))).toBeNull();
  });

  it('returns null for spans with no attributes', () => {
    expect(getSpanTypeIcon(makeSpan([]))).toBeNull();
  });

  it('gen_ai takes priority over db when both present', () => {
    expect(getSpanTypeIcon(makeSpan(['gen_ai.model', 'db.system']))).toBe(IoSparkles);
  });
});
