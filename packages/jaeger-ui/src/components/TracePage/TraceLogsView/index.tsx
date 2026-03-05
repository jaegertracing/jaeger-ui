// Copyright (c) 2025 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useMemo } from 'react';
import { Table, Tooltip } from 'antd';
import { ColumnProps } from 'antd/es/table';
import _sortBy from 'lodash/sortBy';
import './index.css';

import { IOtelTrace, IOtelSpan, IEvent, IAttribute } from '../../../types/otel';
import { Microseconds } from '../../../types/units';
import { formatDuration } from '../../../utils/date';
import prefixUrl from '../../../utils/prefix-url';
import { getTargetEmptyOrBlank } from '../../../utils/config/get-target';

type TraceLogEntry = {
  key: string;
  timestamp: Microseconds;
  relativeTime: Microseconds;
  eventName: string;
  attributes: IAttribute[];
  spanID: string;
  spanName: string;
  serviceName: string;
  traceID: string;
};

type Props = {
  trace: IOtelTrace;
  useOtelTerms: boolean;
};

function collectLogEntries(trace: IOtelTrace): TraceLogEntry[] {
  const entries: TraceLogEntry[] = [];
  trace.spans.forEach((span: IOtelSpan) => {
    if (span.events && span.events.length > 0) {
      span.events.forEach((event: IEvent, index: number) => {
        entries.push({
          key: `${span.spanID}-${index}`,
          timestamp: event.timestamp,
          relativeTime: (event.timestamp - trace.startTime) as Microseconds,
          eventName: event.name,
          attributes: event.attributes,
          spanID: span.spanID,
          spanName: span.name,
          serviceName: span.resource.serviceName,
          traceID: span.traceID,
        });
      });
    }
  });
  return _sortBy(entries, 'timestamp');
}

export default function TraceLogsView({ trace, useOtelTerms }: Props) {
  const logEntries = useMemo(() => collectLogEntries(trace), [trace]);

  if (logEntries.length === 0) {
    return (
      <div className="TraceLogsView" data-testid="trace-logs-view">
        <h3 className="TraceLogsView--title">{useOtelTerms ? 'Trace Events' : 'Trace Logs'}</h3>
        <div className="TraceLogsView--empty" data-testid="trace-logs-empty">
          No {useOtelTerms ? 'events' : 'logs'} found in this trace.
        </div>
      </div>
    );
  }

  const columns: ColumnProps<TraceLogEntry>[] = [
    {
      title: 'Timestamp',
      dataIndex: 'relativeTime',
      sorter: (a: TraceLogEntry, b: TraceLogEntry) => a.relativeTime - b.relativeTime,
      defaultSortOrder: 'ascend' as const,
      render: (relativeTime: Microseconds) => {
        return (
          <Tooltip title={formatDuration(relativeTime)}>
            <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{formatDuration(relativeTime)}</span>
          </Tooltip>
        );
      },
      width: '12%',
    },
    {
      title: 'Service Name',
      dataIndex: 'serviceName',
      sorter: (a: TraceLogEntry, b: TraceLogEntry) => a.serviceName.localeCompare(b.serviceName),
      width: '15%',
    },
    {
      title: useOtelTerms ? 'Span Name' : 'Operation',
      dataIndex: 'spanName',
      sorter: (a: TraceLogEntry, b: TraceLogEntry) => a.spanName.localeCompare(b.spanName),
      width: '15%',
    },
    {
      title: useOtelTerms ? 'Event' : 'Log',
      dataIndex: 'eventName',
      sorter: (a: TraceLogEntry, b: TraceLogEntry) => a.eventName.localeCompare(b.eventName),
      width: '12%',
    },
    {
      title: 'Attributes',
      dataIndex: 'attributes',
      render: (attributes: IAttribute[]) => {
        if (!attributes || attributes.length === 0) {
          return <span>—</span>;
        }
        return (
          <div className="event-attributes">
            {attributes.map((attr: IAttribute) => (
              <span key={attr.key} className="attribute-tag">
                {attr.key}={String(attr.value)}
              </span>
            ))}
          </div>
        );
      },
      width: '31%',
    },
    {
      title: 'Span ID',
      dataIndex: 'spanID',
      render: (spanID: string, record: TraceLogEntry) => (
        <a
          href={prefixUrl(`/trace/${record.traceID}?uiFind=${spanID}`)}
          target={getTargetEmptyOrBlank()}
          rel="noopener noreferrer"
          className="span-id-cell"
        >
          {spanID}
        </a>
      ),
      width: '15%',
    },
  ];

  return (
    <div className="TraceLogsView" data-testid="trace-logs-view">
      <h3 className="TraceLogsView--title">{useOtelTerms ? 'Trace Events' : 'Trace Logs'}</h3>
      <Table
        className="trace-logs-table"
        columns={columns}
        dataSource={logEntries}
        rowKey="key"
        pagination={{
          total: logEntries.length,
          pageSizeOptions: ['10', '20', '50', '100'],
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />
    </div>
  );
}
