// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Link } from 'react-router-dom';
import { Table } from 'antd';
import { ColumnProps } from 'antd/es/table';

import * as orderBy from '../../../model/order-by';
import { formatDatetime, formatDuration } from '../../../utils/date';

import { IOtelTrace, StatusCode } from '../../../types/otel';
import type { TracePageLink } from '../../TracePage/url';

import './TraceTable.css';

type TraceTableProps = {
  getTracePageLink: (trace: IOtelTrace) => TracePageLink;
  handleSortChange: (sortBy: string) => void;
  onRowClick: (traceID: string) => void;
  sortBy: string;
  traces: IOtelTrace[];
};

type SortOrder = 'ascend' | 'descend' | null;

function getErrorCount(trace: IOtelTrace) {
  return trace.spans.filter(span => span.status?.code === StatusCode.ERROR).length;
}

function getSortOrder(sortBy: string, columnKey: string): SortOrder {
  if (columnKey === 'duration') {
    if (sortBy === orderBy.LONGEST_FIRST) return 'descend';
    if (sortBy === orderBy.SHORTEST_FIRST) return 'ascend';
  }
  if (columnKey === 'spanCount') {
    if (sortBy === orderBy.MOST_SPANS) return 'descend';
    if (sortBy === orderBy.LEAST_SPANS) return 'ascend';
  }
  if (columnKey === 'startTime' && sortBy === orderBy.MOST_RECENT) {
    return 'descend';
  }
  return null;
}

function getSortBy(columnKey: React.Key | undefined, order: SortOrder) {
  if (columnKey === 'duration') {
    return order === 'ascend' ? orderBy.SHORTEST_FIRST : orderBy.LONGEST_FIRST;
  }
  if (columnKey === 'spanCount') {
    return order === 'ascend' ? orderBy.LEAST_SPANS : orderBy.MOST_SPANS;
  }
  if (columnKey === 'startTime') {
    return orderBy.MOST_RECENT;
  }
  return null;
}

export default function TraceTable({
  getTracePageLink,
  handleSortChange,
  onRowClick,
  sortBy,
  traces,
}: TraceTableProps) {
  const columns: ColumnProps<IOtelTrace>[] = [
    {
      key: 'traceName',
      title: 'Trace Name',
      render: (_value, trace) => {
        const linkTo = getTracePageLink(trace);
        return (
          <Link
            className="TraceTable--traceLink"
            onClick={event => event.stopPropagation()}
            to={{ pathname: linkTo.pathname, search: linkTo.search }}
            state={linkTo.state}
          >
            <span className="TraceTable--traceName">{trace.traceName}</span>
            <span className="TraceTable--traceID">{trace.traceID}</span>
          </Link>
        );
      },
    },
    {
      key: 'services',
      title: 'Services',
      render: (_value, trace) => (trace.services || []).map(service => service.name).join(', '),
    },
    {
      key: 'spanCount',
      title: 'Spans',
      align: 'right',
      sorter: true,
      sortOrder: getSortOrder(sortBy, 'spanCount'),
      render: (_value, trace) => trace.spans.length,
    },
    {
      key: 'errorCount',
      title: 'Errors',
      align: 'right',
      render: (_value, trace) => getErrorCount(trace),
    },
    {
      key: 'duration',
      title: 'Duration',
      align: 'right',
      sorter: true,
      sortOrder: getSortOrder(sortBy, 'duration'),
      render: (_value, trace) => formatDuration(trace.duration),
    },
    {
      key: 'startTime',
      title: 'Start Time',
      sorter: true,
      sortDirections: ['descend'],
      sortOrder: getSortOrder(sortBy, 'startTime'),
      render: (_value, trace) => formatDatetime(trace.startTime),
    },
  ];

  return (
    <Table
      className="TraceTable"
      columns={columns}
      dataSource={traces}
      onChange={(_pagination, _filters, sorter) => {
        const activeSorter = Array.isArray(sorter) ? sorter[0] : sorter;
        if (!activeSorter) {
          return;
        }
        const nextSortBy = getSortBy(activeSorter.columnKey, activeSorter.order as SortOrder);
        if (nextSortBy) {
          handleSortChange(nextSortBy);
        }
      }}
      onRow={trace => ({
        onClick: () => onRowClick(trace.traceID),
      })}
      pagination={false}
      rowClassName="TraceTable--row"
      rowKey="traceID"
      size="small"
    />
  );
}
