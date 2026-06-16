// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0
//
// Adapted from @pyroscope/flamegraph v0.35.6 (Apache-2.0)
// Copyright (c) 2020 Pyroscope, Inc.

// Sortable table showing aggregated span durations by service:operation,
// with color-coded service indicators and proportional duration bars.

import React, { useMemo } from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import colorGenerator from '../../../utils/color-generator';
import { formatDurationCompact } from '../../../utils/date';
import { Microseconds } from '../../../types/units';
import { IFlamegraphTableRow } from './generateTableData';

type Props = {
  data: IFlamegraphTableRow[];
  searchQuery: string;
  selectedItem: string | null;
  onRowClick: (name: string) => void;
  maxSelf: number;
  maxTotal: number;
};

function durationBarStyle(value: number, max: number): React.CSSProperties {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return {
    background: `linear-gradient(to right, var(--interactive-primary-light) ${pct}%, transparent ${pct}%)`,
  };
}

const FlamegraphTable = ({ data, searchQuery, selectedItem, onRowClick, maxSelf, maxTotal }: Props) => {
  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(row => row.name.toLowerCase().includes(q));
  }, [data, searchQuery]);

  const columns: ColumnsType<IFlamegraphTableRow> = [
    {
      title: 'Location',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, row: IFlamegraphTableRow) => (
        <div className="Flamegraph-table--location">
          <span
            className="Flamegraph-table--color-dot"
            style={{ backgroundColor: colorGenerator.getColorByKey(row.serviceName) }}
          />
          {name}
        </div>
      ),
    },
    {
      title: 'Self',
      dataIndex: 'self',
      key: 'self',
      width: 130,
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.self - b.self,
      render: (value: number) => (
        <div className="Flamegraph-table--duration-cell" style={durationBarStyle(value, maxSelf)}>
          <span className="Flamegraph-table--duration-value">
            {formatDurationCompact(value as Microseconds)}
          </span>
        </div>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 130,
      sorter: (a, b) => a.total - b.total,
      render: (value: number) => (
        <div className="Flamegraph-table--duration-cell" style={durationBarStyle(value, maxTotal)}>
          <span className="Flamegraph-table--duration-value">
            {formatDurationCompact(value as Microseconds)}
          </span>
        </div>
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
      rowClassName={record => (record.name === selectedItem ? 'Flamegraph-table--row-selected' : '')}
      onRow={record => ({
        onClick: () => onRowClick(record.name),
      })}
      data-testid="flamegraph-table"
    />
  );
};

export default FlamegraphTable;
