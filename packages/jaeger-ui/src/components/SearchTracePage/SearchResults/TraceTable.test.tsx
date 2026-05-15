// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { TraceTable } from './TraceTable';
import { SpanKind, StatusCode } from '../../../types/otel';
import type { IOtelTrace, IOtelSpan } from '../../../types/otel';

function makeSpan(id: string, traceID: string, serviceName: string, opName: string): IOtelSpan {
  return {
    spanID: id,
    traceID,
    name: opName,
    kind: SpanKind.SERVER,
    startTime: 0 as IOtelSpan['startTime'],
    endTime: 1000 as IOtelSpan['endTime'],
    duration: 1000 as IOtelSpan['duration'],
    attributes: [],
    events: [],
    links: [],
    inboundLinks: [],
    status: { code: StatusCode.OK },
    resource: { serviceName, attributes: [] },
    instrumentationScope: { name: '' },
    depth: 0,
    hasChildren: false,
    childSpans: [],
    relativeStartTime: 0 as IOtelSpan['relativeStartTime'],
    warnings: null,
    parentSpanID: undefined,
    parentSpan: undefined,
  };
}

function makeTrace(id: string, spanCount = 3, duration = 5000, startTime = 0): IOtelTrace {
  const spans: IOtelSpan[] = Array.from({ length: spanCount }, (_, i) =>
    makeSpan(`${id}-s${i}`, id, `svc-${id}`, `op-${i}`)
  );
  const rootSpan = makeSpan(`${id}-root`, id, `root-svc-${id}`, `root-op-${id}`);
  return {
    traceID: id,
    traceName: `root-svc-${id}: root-op-${id}`,
    duration: duration as IOtelTrace['duration'],
    startTime: startTime as IOtelTrace['startTime'],
    endTime: (startTime + duration) as IOtelTrace['endTime'],
    tracePageTitle: '',
    traceEmoji: '',
    services: [{ name: `svc-${id}`, numberOfSpans: spanCount }],
    spanMap: new Map(),
    orphanSpanCount: 0,
    hasErrors: () => false,
    spans,
    rootSpans: [rootSpan],
  };
}

describe('<TraceTable>', () => {
  it('renders a row for each trace', () => {
    const traces = [makeTrace('abc123456789'), makeTrace('def456789012')];
    render(
      <MemoryRouter>
        <TraceTable traces={traces} searchUrl="/search" />
      </MemoryRouter>
    );
    expect(screen.getByText('root-svc-abc123456789')).toBeInTheDocument();
    expect(screen.getByText('root-svc-def456789012')).toBeInTheDocument();
  });

  it('shows root service and operation from rootSpans', () => {
    const traces = [makeTrace('aaa111222333')];
    render(
      <MemoryRouter>
        <TraceTable traces={traces} searchUrl="/search" />
      </MemoryRouter>
    );
    expect(screen.getByText('root-svc-aaa111222333')).toBeInTheDocument();
    expect(screen.getByText('root-op-aaa111222333')).toBeInTheDocument();
  });

  it('shows span count for each trace', () => {
    const traces = [makeTrace('bbb222333444', 7)];
    render(
      <MemoryRouter>
        <TraceTable traces={traces} searchUrl="/search" />
      </MemoryRouter>
    );
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders empty state when no traces provided', () => {
    render(
      <MemoryRouter>
        <TraceTable traces={[]} searchUrl="/search" />
      </MemoryRouter>
    );
    const noDataEls = screen.getAllByText(/no data/i);
    expect(noDataEls.length).toBeGreaterThan(0);
  });

  it('links trace ID to the trace page with fromSearch state', () => {
    const traces = [makeTrace('abc123456789')];
    render(
      <MemoryRouter>
        <TraceTable traces={traces} searchUrl="/search" />
      </MemoryRouter>
    );
    const link = screen.getByRole('link', { name: /abc/i });
    expect(link.getAttribute('href')).toContain('/trace/abc123456789');
  });
});
