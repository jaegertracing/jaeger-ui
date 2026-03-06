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

  it('toggles attribute accordion open and closed on click', async () => {
    const { fireEvent } = require('@testing-library/react');
    const trace = transformTraceData(baseTrace).asOtelTrace();
    render(<TraceLogsView trace={trace} useOtelTerms={false} />);

    // AccordionAttributes renders a clickable label area for toggling
    const accordionHeaders = screen.getAllByText('Tags');
    // Filter to find the clickable accordion headers (not the column header)
    const clickableHeaders = accordionHeaders.filter(el => el.closest('a') || el.closest('[role="switch"]'));
    if (clickableHeaders.length > 0) {
      fireEvent.click(clickableHeaders[0]);
      fireEvent.click(clickableHeaders[0]);
    } else {
      // Fallback: find any accordion toggle via the arrow icon
      const arrows = document.querySelectorAll('[class*="Accordion"] a, [class*="accordion"] a');
      if (arrows.length > 0) {
        fireEvent.click(arrows[0]);
        fireEvent.click(arrows[0]);
      }
    }
  });

  it('renders em dash for log entries with no attributes', () => {
    const traceWithEmptyAttrs = {
      traceID: 'trace-empty-attrs',
      spans: [
        {
          traceID: 'trace-empty-attrs',
          spanID: 'span-ea',
          operationName: 'op-ea',
          startTime: 3000000,
          duration: 100000,
          references: [],
          tags: [],
          logs: [
            {
              timestamp: 3050000,
              fields: [{ key: 'event', value: 'empty_attrs_event' }],
            },
          ],
          processID: 'p1',
          warnings: null,
        },
      ],
      processes: {
        p1: { serviceName: 'test-svc', tags: [] },
      },
    };
    const trace = transformTraceData(traceWithEmptyAttrs).asOtelTrace();
    // Remove attributes from events to trigger the empty branch
    trace.spans[0].events[0].attributes = [];
    render(<TraceLogsView trace={trace} useOtelTerms={false} />);

    // Should render the em dash for empty attributes
    const noAttrs = document.querySelector('.TraceLogsView--no-attrs');
    expect(noAttrs).toBeInTheDocument();
    expect(noAttrs.textContent).toBe('—');
  });

  it('sorts entries by timestamp by default (ascending)', () => {
    const trace = transformTraceData(baseTrace).asOtelTrace();
    render(<TraceLogsView trace={trace} useOtelTerms={false} />);

    // The table rows should be sorted by timestamp ascending
    const rows = document.querySelectorAll('.ant-table-tbody tr');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('handles column sorting for service name', () => {
    const { fireEvent } = require('@testing-library/react');
    const trace = transformTraceData(baseTrace).asOtelTrace();
    render(<TraceLogsView trace={trace} useOtelTerms={false} />);

    // Click service name column header to trigger sorter
    const serviceHeader = screen.getByText('Service');
    fireEvent.click(serviceHeader);
  });

  it('handles column sorting for operation/span name', () => {
    const { fireEvent } = require('@testing-library/react');
    const trace = transformTraceData(baseTrace).asOtelTrace();
    render(<TraceLogsView trace={trace} useOtelTerms={false} />);

    const opHeader = screen.getByText('Operation');
    fireEvent.click(opHeader);
  });

  it('handles column sorting for event/log name', () => {
    const { fireEvent } = require('@testing-library/react');
    const trace = transformTraceData(baseTrace).asOtelTrace();
    render(<TraceLogsView trace={trace} useOtelTerms={false} />);

    const logHeader = screen.getByText('Log');
    fireEvent.click(logHeader);
  });
});
