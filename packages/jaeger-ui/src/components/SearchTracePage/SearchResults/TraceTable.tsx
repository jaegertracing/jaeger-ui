// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';
import { getTracePageLink } from '../../TracePage/url';
import { IOtelTrace } from '../../../types/otel';

type TraceTableProps = {
  traces: IOtelTrace[];
  maxTraceDuration: number;
  onRowClick: (traceID: string) => void;
  sortBy: string;
  handleSortChange: (sortBy: string) => void;
};

export default function TraceTable({ traces, onRowClick }: TraceTableProps) {
  const columns: ColumnsType<IOtelTrace> = [
    {
      title: 'Trace Name',
      dataIndex: 'traceName',
      key: 'traceName',
      render: (name: string, trace: IOtelTrace) => {
        const link = getTracePageLink(trace.traceID);
        return (
          <Link to={link.pathname + (link.search ? `?${link.search}` : '')}>{name || trace.traceID}</Link>
        );
      },
    },
    {
      title: 'Services',
      key: 'services',
      render: (_: any, trace: IOtelTrace) =>
        trace.services ? trace.services.map((s: any) => s.name).join(', ') : '-',
    },
    {
      title: 'Spans',
      key: 'spans',
      render: (_: any, trace: IOtelTrace) => trace.spans.length,
      sorter: (a: IOtelTrace, b: IOtelTrace) => a.spans.length - b.spans.length,
    },
    {
      title: 'Errors',
      key: 'errors',
      render: (_: any, trace: IOtelTrace) =>
        trace.spans.filter((s: any) => s.status?.code === 'ERROR').length,
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (_: any, trace: IOtelTrace) => `${(trace.duration / 1000).toFixed(2)}ms`,
      sorter: (a: IOtelTrace, b: IOtelTrace) => a.duration - b.duration,
    },
    {
      title: 'Start Time',
      key: 'startTime',
      render: (_: any, trace: IOtelTrace) => new Date(trace.startTime / 1000).toLocaleString(),
      sorter: (a: IOtelTrace, b: IOtelTrace) => a.startTime - b.startTime,
    },
  ];

  return (
    <Table<IOtelTrace>
      columns={columns}
      dataSource={traces}
      rowKey="traceID"
      size="small"
      pagination={{ pageSize: 20 }}
      onRow={(trace: IOtelTrace) => ({
        onClick: () => onRowClick(trace.traceID),
        style: { cursor: 'pointer' },
      })}
    />
  );
}
