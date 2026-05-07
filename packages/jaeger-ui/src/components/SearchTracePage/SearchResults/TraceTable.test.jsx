// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import TraceTable from './TraceTable';
import * as orderBy from '../../../model/order-by';
import { StatusCode } from '../../../types/otel';

const getTracePageLink = trace => ({
  pathname: `/trace/${trace.traceID}`,
  state: { fromSearch: '/search' },
});

const makeSpan = (spanID, statusCode = StatusCode.OK) => ({
  attributes: [],
  childSpans: [],
  duration: 1,
  endTime: 1,
  events: [],
  hasChildren: false,
  inboundLinks: [],
  instrumentationScope: { name: 'test' },
  kind: 'INTERNAL',
  links: [],
  name: `span-${spanID}`,
  relativeStartTime: 0,
  resource: { attributes: [], serviceName: 'svc' },
  spanID,
  startTime: 0,
  status: { code: statusCode },
  traceID: 'trace',
  warnings: null,
});

const makeTrace = (traceID, spans = []) => ({
  duration: 1000,
  endTime: 2000,
  hasErrors: () => spans.some(span => span.status.code === StatusCode.ERROR),
  orphanSpanCount: 0,
  rootSpans: [],
  services: [{ name: 'svc', numberOfSpans: spans.length }],
  spanMap: new Map(),
  spans,
  startTime: 1000,
  traceEmoji: '',
  traceID,
  traceName: `trace-${traceID}`,
  tracePageTitle: `trace-${traceID}`,
});

const renderTraceTable = props =>
  render(
    <MemoryRouter>
      <TraceTable
        getTracePageLink={getTracePageLink}
        handleSortChange={jest.fn()}
        onRowClick={jest.fn()}
        sortBy={orderBy.MOST_RECENT}
        traces={[]}
        {...props}
      />
    </MemoryRouter>
  );

describe('<TraceTable>', () => {
  it('renders one table row for each trace', () => {
    const traces = ['a', 'b', 'c', 'd', 'e'].map(traceID => makeTrace(traceID));
    const { container } = renderTraceTable({ traces });

    expect(container.querySelectorAll('tbody tr')).toHaveLength(5);
  });

  it('shows the error count for traces with errored spans', () => {
    const traces = [
      makeTrace('errored', [
        makeSpan('1', StatusCode.ERROR),
        makeSpan('2', StatusCode.OK),
        makeSpan('3', StatusCode.ERROR),
      ]),
    ];

    renderTraceTable({ traces });

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('calls handleSortChange when a sortable table column is clicked', () => {
    const handleSortChange = jest.fn();
    renderTraceTable({ handleSortChange, traces: [makeTrace('a')] });

    fireEvent.click(screen.getByText('Duration'));

    expect(handleSortChange).toHaveBeenCalledWith(orderBy.SHORTEST_FIRST);
  });
});
