// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useMemo } from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd';
import { Link } from 'react-router-dom';

import { getTracePageLink } from '../../TracePage/url';
import { formatDurationCompact, formatDatetime } from '../../../utils/date';
import getConfig from '../../../utils/config/get-config';

import { IOtelTrace } from '../../../types/otel';

type Props = { traces: IOtelTrace[]; searchUrl: string };

export function TraceTable({ traces, searchUrl }: Props) {
  const displayLen = getConfig().traceIdDisplayLength ?? 7;

  const columns: TableProps<IOtelTrace>['columns'] = useMemo(
    () => [
      {
        title: 'Trace ID',
        key: 'traceID',
        render: (_: unknown, trace: IOtelTrace) => {
          const link = getTracePageLink(trace.traceID, { fromSearch: searchUrl });
          return (
            <Link to={`${link.pathname}${link.search || ''}`} state={link.state}>
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
    ],
    [searchUrl, displayLen]
  );

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
