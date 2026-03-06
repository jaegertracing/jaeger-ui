// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TraceLogsView from './index';
import transformTraceData from '../../../model/transform-trace-data';

// Test trace with logs/events on some spans
const baseTrace = {
  traceID: 'trace-abc',
  spans: [
    {
      traceID: 'trace-abc',
      spanID: 'span-1',
      operationName: 'op1',
      startTime: 1000000,
      duration: 500000,
      references: [],
      tags: [],
      logs: [
        {
          timestamp: 1100000,
          fields: [
            { key: 'event', value: 'request_started' },
            { key: 'level', value: 'INFO' },
          ],
        },
        {
          timestamp: 1400000,
          fields: [
            { key: 'event', value: 'request_finished' },
            { key: 'status_code', value: '200' },
          ],
        },
      ],
      processID: 'p1',
      warnings: null,
    },
    {
      traceID: 'trace-abc',
      spanID: 'span-2',
      operationName: 'op2',
      startTime: 1200000,
      duration: 100000,
      references: [{ refType: 'CHILD_OF', traceID: 'trace-abc', spanID: 'span-1' }],
      tags: [],
      logs: [
        {
          timestamp: 1250000,
          fields: [
            { key: 'event', value: 'db_query' },
            { key: 'query', value: 'SELECT *' },
          ],
        },
      ],
      processID: 'p2',
      warnings: null,
    },
    {
      traceID: 'trace-abc',
      spanID: 'span-3',
      operationName: 'op3',
      startTime: 1300000,
      duration: 50000,
      references: [{ refType: 'CHILD_OF', traceID: 'trace-abc', spanID: 'span-1' }],
      tags: [],
      logs: [],
      processID: 'p1',
      warnings: null,
    },
  ],
  processes: {
    p1: { serviceName: 'frontend', tags: [] },
    p2: { serviceName: 'backend', tags: [] },
  },
};

const noLogsTrace = {
  traceID: 'trace-nologs',
  spans: [
    {
      traceID: 'trace-nologs',
      spanID: 'span-x',
      operationName: 'opx',
      startTime: 2000000,
      duration: 100000,
      references: [],
      tags: [],
      logs: [],
      processID: 'p1',
      warnings: null,
    },
  ],
  processes: {
    p1: { serviceName: 'service-a', tags: [] },
  },
};

describe('<TraceLogsView>', () => {
  it('renders trace logs table with all log entries', () => {
    const trace = transformTraceData(baseTrace).asOtelTrace();
    render(<TraceLogsView trace={trace} useOtelTerms={false} />);

    expect(screen.getByTestId('trace-logs-view')).toBeInTheDocument();
    expect(screen.getByText('Trace Logs')).toBeInTheDocument();

    // Should show all 3 log entries from 2 spans (event names appear in both Log column and Attributes summary)
    expect(screen.getAllByText('request_started').length).toBeGreaterThan(0);
    expect(screen.getAllByText('request_finished').length).toBeGreaterThan(0);
    expect(screen.getAllByText('db_query').length).toBeGreaterThan(0);
  });

  it('shows empty message when trace has no logs', () => {
    const trace = transformTraceData(noLogsTrace).asOtelTrace();
    render(<TraceLogsView trace={trace} useOtelTerms={false} />);

    expect(screen.getByTestId('trace-logs-empty')).toBeInTheDocument();
    expect(screen.getByText(/No logs found in this trace/)).toBeInTheDocument();
  });

  it('uses OTel terminology when useOtelTerms is true', () => {
    const trace = transformTraceData(baseTrace).asOtelTrace();
    render(<TraceLogsView trace={trace} useOtelTerms />);

    expect(screen.getByText('Trace Events')).toBeInTheDocument();
    expect(screen.getByText('Event')).toBeInTheDocument();
    expect(screen.getByText('Span Name')).toBeInTheDocument();
    // OTel uses 'Attributes'
    expect(screen.getAllByText('Attributes').length).toBeGreaterThan(0);
  });

  it('uses legacy terminology when useOtelTerms is false', () => {
    const trace = transformTraceData(baseTrace).asOtelTrace();
    render(<TraceLogsView trace={trace} useOtelTerms={false} />);

    expect(screen.getByText('Trace Logs')).toBeInTheDocument();
    expect(screen.getByText('Log')).toBeInTheDocument();
    expect(screen.getByText('Operation')).toBeInTheDocument();
    // Legacy uses 'Tags'
    expect(screen.getAllByText('Tags').length).toBeGreaterThan(0);
  });

  it('shows empty OTel message when useOtelTerms is true and no events', () => {
    const trace = transformTraceData(noLogsTrace).asOtelTrace();
    render(<TraceLogsView trace={trace} useOtelTerms />);

    expect(screen.getByText('Trace Events')).toBeInTheDocument();
    expect(screen.getByText(/No events found in this trace/)).toBeInTheDocument();
  });

  it('displays service name and span name from parent span', () => {
    const trace = transformTraceData(baseTrace).asOtelTrace();
    render(<TraceLogsView trace={trace} useOtelTerms={false} />);

    // frontend service
    expect(screen.getAllByText('frontend').length).toBeGreaterThan(0);
    // backend service
    expect(screen.getAllByText('backend').length).toBeGreaterThan(0);
  });

  it('renders attributes using AccordionAttributes (collapsed summary)', () => {
    const trace = transformTraceData(baseTrace).asOtelTrace();
    render(<TraceLogsView trace={trace} useOtelTerms={false} />);

    // AccordionAttributes renders a collapsed summary showing key=value pairs
    // The attribute keys from the log entries should appear in the summary
    expect(screen.getAllByText('level').length).toBeGreaterThan(0);
  });

  it('renders span IDs as links', () => {
    const trace = transformTraceData(baseTrace).asOtelTrace();
    render(<TraceLogsView trace={trace} useOtelTerms={false} />);

    const spanLinks = screen.getAllByText('span-1');
    // span-1 has 2 logs so appears twice
    expect(spanLinks.length).toBe(2);
    expect(spanLinks[0].closest('a')).toHaveAttribute('href', expect.stringContaining('uiFind=span-1'));
  });

  it('renders the table with correct columns', () => {
    const trace = transformTraceData(baseTrace).asOtelTrace();
    render(<TraceLogsView trace={trace} useOtelTerms={false} />);

    expect(screen.getByText('Timestamp')).toBeInTheDocument();
    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByText('Operation')).toBeInTheDocument();
    expect(screen.getByText('Log')).toBeInTheDocument();
    expect(screen.getByText('Span ID')).toBeInTheDocument();
  });
});
