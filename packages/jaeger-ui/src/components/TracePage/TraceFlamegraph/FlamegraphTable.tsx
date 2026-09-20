// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0
//
// Adapted from @pyroscope/flamegraph v0.35.6 (Apache-2.0)
// Copyright (c) 2020 Pyroscope, Inc.

// Sortable table showing aggregated span durations by service:operation,
// with color-coded service indicators and proportional duration bars.

import React, { useMemo, useState } from 'react';
import { Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { SorterResult } from 'antd/es/table/interface';

import { useConfig } from '../../../hooks/useConfig';
import colorGenerator from '../../../utils/color-generator';
import { formatDuration, formatDurationCompact } from '../../../utils/date';
import { Microseconds } from '../../../types/units';
import RelativeBar from '../../common/RelativeBar';
import { IFlamegraphTableRow } from './generateTableData';

type Props = {
  data: IFlamegraphTableRow[];
  searchQuery: string;
  selectedItem: string | null;
  onRowClick: (name: string) => void;
  maxSelf: number;
  maxTotal: number;
};

const FlamegraphTable = ({ data, searchQuery, selectedItem, onRowClick, maxSelf, maxTotal }: Props) => {
  const { useOpenTelemetryTerms } = useConfig();
  const [sortState, setSortState] = useState<{ field: string; order: 'ascend' | 'descend' }>({
    field: 'self',
    order: 'descend',
  });

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(row => row.name.toLowerCase().includes(q));
  }, [data, searchQuery]);

  const handleTableChange = (
    _pagination: any,
    _filters: any,
    sorter: SorterResult<IFlamegraphTableRow> | SorterResult<IFlamegraphTableRow>[]
  ) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    if (s.columnKey && s.order) {
      setSortState({ field: s.columnKey as string, order: s.order });
    } else {
      const newOrder = sortState.order === 'descend' ? 'ascend' : 'descend';
      setSortState({ field: sortState.field, order: newOrder });
    }
  };

  const columns: ColumnsType<IFlamegraphTableRow> = [
    {
      title: `Service & ${useOpenTelemetryTerms ? 'Span Name' : 'Operation'}`,
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      sortOrder: sortState.field === 'name' ? sortState.order : undefined,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_name: string, row: IFlamegraphTableRow) => {
        const opName = row.name.slice(row.serviceName.length + 2);
        return (
          <div className="Flamegraph-table--location">
            <span
              className="Flamegraph-table--color-dot"
              style={{ backgroundColor: colorGenerator.getColorByKey(row.serviceName) }}
            />
            <span className="Flamegraph-table--svc-name">{row.serviceName}</span>
            <small className="Flamegraph-table--op-name">{opName}</small>
          </div>
        );
      },
    },
    {
      title: 'Count',
      dataIndex: 'count',
      key: 'count',
      width: 70,
      sortOrder: sortState.field === 'count' ? sortState.order : undefined,
      sorter: (a, b) => a.count - b.count,
    },
    {
      title: 'Self',
      dataIndex: 'self',
      key: 'self',
      width: 160,
      sortOrder: sortState.field === 'self' ? sortState.order : undefined,
      sorter: (a, b) => a.self - b.self,
      render: (value: number) => (
        <Tooltip title={formatDuration(value as Microseconds)}>
          <div className="Flamegraph-table--duration-cell">
            <RelativeBar value={value} maxValue={maxSelf} />
            <span className="Flamegraph-table--duration-value">
              {formatDurationCompact(value as Microseconds)}
            </span>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 160,
      sortOrder: sortState.field === 'total' ? sortState.order : undefined,
      sorter: (a, b) => a.total - b.total,
      render: (value: number) => (
        <Tooltip title={formatDuration(value as Microseconds)}>
          <div className="Flamegraph-table--duration-cell">
            <RelativeBar value={value} maxValue={maxTotal} />
            <span className="Flamegraph-table--duration-value">
              {formatDurationCompact(value as Microseconds)}
            </span>
          </div>
        </Tooltip>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={filteredData}
      rowKey="key"
      size="small"
      pagination={false}
      showSorterTooltip={false}
      onChange={handleTableChange}
      rowClassName={record => (record.name === selectedItem ? 'Flamegraph-table--row-selected' : '')}
      onRow={record => ({
        onClick: () => onRowClick(record.name),
      })}
      scroll={{ x: 'max-content' }}
      data-testid="flamegraph-table"
    />
  );
};

export default FlamegraphTable;
