// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useMemo, useState } from 'react';
import { Table } from 'antd';
import { ColumnProps } from 'antd/es/table';
import _sortBy from 'lodash/sortBy';
import './index.css';

import AccordionAttributes from '../TraceTimelineViewer/SpanDetail/AccordionAttributes';
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
  const [openAttributes, setOpenAttributes] = useState<Set<string>>(new Set());

  const toggleAttributes = (key: string) => {
    setOpenAttributes(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

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

  const attributesLabel = useOtelTerms ? 'Attributes' : 'Tags';

  const columns: ColumnProps<TraceLogEntry>[] = [
    {
      title: 'Timestamp',
      dataIndex: 'relativeTime',
      sorter: (a: TraceLogEntry, b: TraceLogEntry) => a.relativeTime - b.relativeTime,
      defaultSortOrder: 'ascend' as const,
      render: (relativeTime: Microseconds) => (
        <span className="TraceLogsView--mono">{formatDuration(relativeTime)}</span>
      ),
      width: 90,
    },
    {
      title: 'Service',
      dataIndex: 'serviceName',
      sorter: (a: TraceLogEntry, b: TraceLogEntry) => a.serviceName.localeCompare(b.serviceName),
      width: 120,
    },
    {
      title: useOtelTerms ? 'Span Name' : 'Operation',
      dataIndex: 'spanName',
      sorter: (a: TraceLogEntry, b: TraceLogEntry) => a.spanName.localeCompare(b.spanName),
      width: 140,
    },
    {
      title: useOtelTerms ? 'Event' : 'Log',
      dataIndex: 'eventName',
      sorter: (a: TraceLogEntry, b: TraceLogEntry) => a.eventName.localeCompare(b.eventName),
      width: 120,
    },
    {
      title: attributesLabel,
      dataIndex: 'attributes',
      render: (attributes: IAttribute[], record: TraceLogEntry) => {
        if (!attributes || attributes.length === 0) {
          return <span className="TraceLogsView--no-attrs">—</span>;
        }
        return (
          <AccordionAttributes
            data={attributes}
            label={attributesLabel}
            linksGetter={null}
            isOpen={openAttributes.has(record.key)}
            onToggle={() => toggleAttributes(record.key)}
          />
        );
      },
    },
    {
      title: 'Span ID',
      dataIndex: 'spanID',
      render: (spanID: string, record: TraceLogEntry) => (
        <a
          href={prefixUrl(`/trace/${record.traceID}?uiFind=${spanID}`)}
          target={getTargetEmptyOrBlank()}
          rel="noopener noreferrer"
          className="TraceLogsView--mono"
        >
          {spanID}
        </a>
      ),
      width: 130,
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
