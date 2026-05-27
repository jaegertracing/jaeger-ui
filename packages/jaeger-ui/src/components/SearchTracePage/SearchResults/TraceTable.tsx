// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useMemo } from 'react';
import { Table } from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';
import { IOtelTrace, StatusCode } from '../../../types/otel';
import { formatDuration, formatDatetime } from '../../../utils/date';
import * as orderBy from '../../../model/order-by';

type TraceTableProps = {
  traces: IOtelTrace[];
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

export default function TraceTable({ traces, onRowClick, sortBy, handleSortChange }: TraceTableProps) {
  const { key: sortKey, order: sortOrder } = fromOrderBy(sortBy);

  const errorCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const trace of traces) {
      let count = 0;
      for (const s of trace.spans) {
        if (s.status?.code === StatusCode.ERROR) count++;
      }
      map.set(trace.traceID, count);
    }
    return map;
  }, [traces]);

  const columns: ColumnsType<IOtelTrace> = useMemo(
    () => [
      {
        title: 'Trace Name',
        dataIndex: 'traceName',
        key: 'traceName',
        render: (name: string, trace: IOtelTrace) => name || trace.traceID,
      },
      {
        title: 'Services',
        key: 'services',
        render: (_: unknown, trace: IOtelTrace) =>
          trace.services ? trace.services.map(s => s.name).join(', ') : '-',
      },
      {
        title: 'Spans',
        key: 'spans',
        render: (_: unknown, trace: IOtelTrace) => trace.spans.length,
        sorter: true,
        sortOrder: sortKey === 'spans' ? sortOrder : undefined,
      },
      {
        title: 'Errors',
        key: 'errors',
        render: (_: unknown, trace: IOtelTrace) => errorCounts.get(trace.traceID) ?? 0,
      },
      {
        title: 'Duration',
        key: 'duration',
        render: (_: unknown, trace: IOtelTrace) => formatDuration(trace.duration),
        sorter: true,
        sortOrder: sortKey === 'duration' ? sortOrder : undefined,
      },
      {
        title: 'Start Time',
        key: 'startTime',
        render: (_: unknown, trace: IOtelTrace) => formatDatetime(trace.startTime),
        sorter: true,
        // startTime descend maps to MOST_RECENT (the default); always show the sort indicator
        sortOrder: sortKey === 'startTime' ? 'descend' : undefined,
        sortDirections: ['descend'],
      },
    ],
    [sortKey, sortOrder, errorCounts]
  );

  const onChange: TableProps<IOtelTrace>['onChange'] = (_pagination, _filters, sorter) => {
    const s = Array.isArray(sorter) ? sorter[0] : (sorter as SorterResult<IOtelTrace>);
    handleSortChange(toOrderBy(s.columnKey as string | undefined, s.order ?? undefined));
  };

  return (
    <Table<IOtelTrace>
      columns={columns}
      dataSource={traces}
      rowKey="traceID"
      size="small"
      pagination={false}
      onChange={onChange}
      onRow={(trace: IOtelTrace) => ({
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
