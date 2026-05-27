// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useMemo } from 'react';
import { Table } from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { TraceSummary } from '../../../types/trace-summary';
import { formatDuration, formatDatetime } from '../../../utils/date';
import * as orderBy from '../../../model/order-by';

type TraceTableProps = {
  traceSummaries: TraceSummary[];
  onRowClick: (traceID: string) => void;
  sortBy: string;
  handleSortChange: (sortBy: string) => void;
};

function toOrderBy(columnKey: string | undefined, order: string | undefined): string {
  if (order == null) return orderBy.MOST_RECENT;
  if (columnKey === 'spans') {
    return order === 'ascend' ? orderBy.LEAST_SPANS : orderBy.MOST_SPANS;
  }
  if (columnKey === 'duration') {
    return order === 'ascend' ? orderBy.SHORTEST_FIRST : orderBy.LONGEST_FIRST;
  }
  // startTime descend === MOST_RECENT (default sort); ascending is not supported
  return orderBy.MOST_RECENT;
}

function fromOrderBy(sort: string): { key: string; order: 'ascend' | 'descend' } {
  switch (sort) {
    case orderBy.MOST_SPANS:
      return { key: 'spans', order: 'descend' };
    case orderBy.LEAST_SPANS:
      return { key: 'spans', order: 'ascend' };
    case orderBy.LONGEST_FIRST:
      return { key: 'duration', order: 'descend' };
    case orderBy.SHORTEST_FIRST:
      return { key: 'duration', order: 'ascend' };
    default:
      return { key: 'startTime', order: 'descend' };
  }
}

export { toOrderBy, fromOrderBy };

export default function TraceTable({ traceSummaries, onRowClick, sortBy, handleSortChange }: TraceTableProps) {
  const { key: sortKey, order: sortOrder } = fromOrderBy(sortBy);

  const columns: ColumnsType<TraceSummary> = useMemo(
    () => [
      {
        title: 'Trace Name',
        dataIndex: 'traceName',
        key: 'traceName',
        render: (name: string, trace: TraceSummary) => name || trace.traceID,
      },
      {
        title: 'Services',
        key: 'services',
        render: (_: unknown, trace: TraceSummary) =>
          trace.services.length > 0 ? trace.services.map(s => s.name).join(', ') : '-',
      },
      {
        title: 'Spans',
        key: 'spans',
        render: (_: unknown, trace: TraceSummary) => trace.spanCount,
        sorter: true,
        sortOrder: sortKey === 'spans' ? sortOrder : undefined,
      },
      {
        title: 'Errors',
        key: 'errors',
        render: (_: unknown, trace: TraceSummary) => trace.errorSpanCount,
      },
      {
        title: 'Duration',
        key: 'duration',
        render: (_: unknown, trace: TraceSummary) => formatDuration(trace.duration),
        sorter: true,
        sortOrder: sortKey === 'duration' ? sortOrder : undefined,
      },
      {
        title: 'Start Time',
        key: 'startTime',
        render: (_: unknown, trace: TraceSummary) => formatDatetime(trace.startTime),
        sorter: true,
        // startTime descend maps to MOST_RECENT (the default); always show the sort indicator
        sortOrder: sortKey === 'startTime' ? 'descend' : undefined,
        sortDirections: ['descend'],
      },
    ],
    [sortKey, sortOrder]
  );

  const onChange: TableProps<TraceSummary>['onChange'] = (_pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : (sorter as SorterResult<TraceSummary>);
    handleSortChange(toOrderBy(s.columnKey as string | undefined, s.order ?? undefined));
  };

  return (
    <Table<TraceSummary>
      columns={columns}
      dataSource={traceSummaries}
      rowKey="traceID"
      size="small"
      pagination={false}
      onChange={onChange}
      onRow={(trace: TraceSummary) => ({
        onClick: () => onRowClick(trace.traceID),
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onRowClick(trace.traceID);
          }
        },
        tabIndex: 0,
        role: 'button',
        'aria-label': `Navigate to trace ${trace.traceName || trace.traceID}`,
        style: { cursor: 'pointer' },
      })}
    />
  );
}
