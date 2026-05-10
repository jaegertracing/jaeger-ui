// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';

import { formatDuration, formatRelativeDate } from '../../../utils/date';
import { IOtelTrace, StatusCode } from '../../../types/otel';
import { Microseconds } from '../../../types/units';
import type { TracePageLink } from '../../TracePage/url/index';

import './TraceTable.css';

type Props = {
  traces: IOtelTrace[];
  getTraceLink: (traceID: string) => TracePageLink;
};

type Row = {
  key: string;
  traceID: string;
  traceName: string;
  services: number;
  spans: number;
  errors: number;
  duration: number;
  startTime: number;
};

function toRows(traces: IOtelTrace[]): Row[] {
  return traces.map(trace => ({
    key: trace.traceID,
    traceID: trace.traceID,
    traceName: trace.traceName,
    services: trace.services.length,
    spans: trace.spans.length,
    errors: trace.spans.filter(s => s.status.code === StatusCode.ERROR).length,
    duration: trace.duration,
    startTime: trace.startTime,
  }));
}

export default function TraceTable({ traces, getTraceLink }: Props) {
  const columns: ColumnsType<Row> = [
    {
      title: 'Trace',
      dataIndex: 'traceName',
      render: (name: string, row: Row) => {
        const link = getTraceLink(row.traceID);
        return (
          <Link to={{ pathname: link.pathname, search: link.search }} state={link.state}>
            {name || row.traceID.slice(0, 7)}
          </Link>
        );
      },
    },
    {
      title: 'Services',
      dataIndex: 'services',
      sorter: (a: Row, b: Row) => a.services - b.services,
      width: 90,
    },
    {
      title: 'Spans',
      dataIndex: 'spans',
      sorter: (a: Row, b: Row) => a.spans - b.spans,
      width: 80,
    },
    {
      title: 'Errors',
      dataIndex: 'errors',
      render: (count: number) =>
        count > 0 ? (
          <Tag color="red" variant="outlined">
            {count}
          </Tag>
        ) : (
          <span>0</span>
        ),
      sorter: (a: Row, b: Row) => a.errors - b.errors,
      width: 80,
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      render: (d: number) => formatDuration(d as Microseconds),
      sorter: (a: Row, b: Row) => a.duration - b.duration,
      width: 110,
    },
    {
      title: 'Start time',
      dataIndex: 'startTime',
      render: (t: number) => formatRelativeDate(t / 1000),
      sorter: (a: Row, b: Row) => a.startTime - b.startTime,
      defaultSortOrder: 'descend',
      width: 160,
    },
  ];

  return (
    <Table<Row>
      className="TraceTable"
      columns={columns}
      dataSource={toRows(traces)}
      size="small"
      pagination={{ pageSize: 100, hideOnSinglePage: true }}
      rowKey="key"
    />
  );
}
