// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import TraceTable from './TraceTable';
import { IOtelTrace, StatusCode, SpanKind } from '../../../types/otel';

vi.mock('react-router-dom', async () => {
  const { MemoryRouter: ActualMemoryRouter } = await vi.importActual('react-router-dom');
  return {
    MemoryRouter: ActualMemoryRouter,
    Link: ({ to, children }: any) => {
      const href = typeof to === 'string' ? to : `${to.pathname}${to.search || ''}`;
      return <a href={href}>{children}</a>;
    },
  };
});

function makeTrace(overrides: Partial<IOtelTrace> = {}): IOtelTrace {
  return {
    traceID: 'abc123',
    traceName: 'test-trace',
    spans: [],
    services: [],
    duration: 1000000 as IOtelTrace['duration'],
    startTime: 1748000000000000 as IOtelTrace['startTime'],
    endTime: 1748000001000000 as IOtelTrace['endTime'],
    spanMap: new Map(),
    rootSpans: [],
    orphanSpanCount: 0,
    tracePageTitle: 'test-trace',
    traceEmoji: '',
    isGenAITrace: false,
    hasErrors: () => false,
    ...overrides,
  } as IOtelTrace;
}

function makeSpan(hasError = false) {
  return {
    spanID: 'span-1',
    traceID: 'abc123',
    name: 'op',
    kind: SpanKind.INTERNAL,
    startTime: 0 as any,
    endTime: 1 as any,
    duration: 1 as any,
    attributes: [],
    events: [],
    links: [],
    inboundLinks: [],
    status: { code: hasError ? StatusCode.ERROR : StatusCode.OK },
    resource: { attributes: [], serviceName: 'svc' },
    instrumentationScope: { name: 'test' },
    depth: 0,
    hasChildren: false,
    childSpans: [],
    relativeStartTime: 0 as any,
    warnings: null,
    parentSpanID: undefined,
    parentSpan: undefined,
  };
}

const getTraceLink = (traceID: string) => ({
  pathname: `/trace/${traceID}`,
  search: '',
  state: undefined,
});

function renderTable(traces: IOtelTrace[]) {
  return render(
    <MemoryRouter>
      <TraceTable traces={traces} getTraceLink={getTraceLink} />
    </MemoryRouter>
  );
}

describe('TraceTable', () => {
  it('renders one row per trace', () => {
    const traces = [
      makeTrace({ traceID: 'aaa', traceName: 'trace-a' }),
      makeTrace({ traceID: 'bbb', traceName: 'trace-b' }),
      makeTrace({ traceID: 'ccc', traceName: 'trace-c' }),
    ];
    renderTable(traces);
    expect(screen.getByText('trace-a')).toBeInTheDocument();
    expect(screen.getByText('trace-b')).toBeInTheDocument();
    expect(screen.getByText('trace-c')).toBeInTheDocument();
  });

  it('renders span count correctly', () => {
    const spans = [makeSpan(), makeSpan()];
    const traces = [makeTrace({ spans: spans as any })];
    renderTable(traces);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders error count as red tag when errors exist', () => {
    const spans = [makeSpan(true), makeSpan(false)];
    const traces = [makeTrace({ spans: spans as any })];
    renderTable(traces);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders no red error tag when there are no errors', () => {
    const traces = [makeTrace({ spans: [makeSpan(false)] as any })];
    const { container } = renderTable(traces);
    expect(container.querySelector('.ant-tag-red')).toBeNull();
  });

  it('renders service count', () => {
    const traces = [
      makeTrace({
        services: [
          { name: 'svc-a', numberOfSpans: 1 },
          { name: 'svc-b', numberOfSpans: 2 },
        ],
      }),
    ];
    renderTable(traces);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('links trace name to trace detail page', () => {
    const traces = [makeTrace({ traceID: 'xyz', traceName: 'linked-trace' })];
    renderTable(traces);
    const link = screen.getByText('linked-trace').closest('a');
    expect(link).toHaveAttribute('href', '/trace/xyz');
  });

  it('falls back to truncated traceID when traceName is empty', () => {
    const traces = [makeTrace({ traceID: 'abcdef1234567', traceName: '' })];
    renderTable(traces);
    expect(screen.getByText('abcdef1')).toBeInTheDocument();
  });
});
