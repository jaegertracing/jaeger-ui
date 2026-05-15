// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Table } from 'antd';
import type { ColumnProps } from 'antd/es/table';
import { Link } from 'react-router-dom';

import { getTracePageLink } from '../../TracePage/url';
import { formatDurationCompact, formatDatetime } from '../../../utils/date';
import getConfig from '../../../utils/config/get-config';

import { IOtelTrace } from '../../../types/otel';

type Props = { traces: IOtelTrace[]; searchUrl: string };

function buildColumns(searchUrl: string): ColumnProps<IOtelTrace>[] {
  return [
    {
      title: 'Trace ID',
      key: 'traceID',
      render: (_: unknown, trace: IOtelTrace) => {
        const link = getTracePageLink(trace.traceID, { fromSearch: searchUrl });
        const displayLen = getConfig().traceIdDisplayLength || 7;
        return (
          <Link to={{ pathname: link.pathname, search: link.search }} state={link.state}>
            {trace.traceID.slice(0, displayLen)}
          </Link>
        );
      },
    },
    {
      title: 'Root Service',
      key: 'service',
      sorter: (a: IOtelTrace, b: IOtelTrace) => {
        const aS = a.rootSpans[0]?.resource.serviceName ?? '';
        const bS = b.rootSpans[0]?.resource.serviceName ?? '';
        return aS.localeCompare(bS);
      },
      render: (_: unknown, trace: IOtelTrace) => trace.rootSpans[0]?.resource.serviceName ?? '',
    },
    {
      title: 'Root Operation',
      key: 'operation',
      sorter: (a: IOtelTrace, b: IOtelTrace) => {
        const aOp = a.rootSpans[0]?.name ?? '';
        const bOp = b.rootSpans[0]?.name ?? '';
        return aOp.localeCompare(bOp);
      },
      render: (_: unknown, trace: IOtelTrace) => trace.rootSpans[0]?.name ?? '',
    },
    {
      title: 'Duration',
      key: 'duration',
      sorter: (a: IOtelTrace, b: IOtelTrace) => a.duration - b.duration,
      render: (_: unknown, trace: IOtelTrace) => formatDurationCompact(trace.duration),
    },
    {
      title: 'Spans',
      key: 'spans',
      sorter: (a: IOtelTrace, b: IOtelTrace) => a.spans.length - b.spans.length,
      render: (_: unknown, trace: IOtelTrace) => trace.spans.length,
    },
    {
      title: 'Timestamp',
      key: 'timestamp',
      sorter: (a: IOtelTrace, b: IOtelTrace) => a.startTime - b.startTime,
      render: (_: unknown, trace: IOtelTrace) => formatDatetime(trace.startTime / 1000),
    },
  ];
}

export function TraceTable({ traces, searchUrl }: Props) {
  const columns = buildColumns(searchUrl);
  return (
    <Table<IOtelTrace>
      rowKey="traceID"
      dataSource={traces}
      columns={columns}
      size="small"
      pagination={{ pageSize: 20, showSizeChanger: true }}
    />
  );
}
