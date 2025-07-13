// Copyright (c) 2020 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as React from 'react';
import { Table } from 'antd';
import { IoFunnel, IoFunnelOutline } from 'react-icons/io5';
import _isEmpty from 'lodash/isEmpty';

import ExamplesLink, { TExample } from '../ExamplesLink';
import DetailTableDropdown from './DetailTableDropdown';

import { TColumnDef, TColumnDefs, TFilterDropdownProps, TRow, TStyledValue } from './types';

// exported for tests
export const _makeFilterDropdown =
  (dataIndex: string, options: Set<string>) => (props: TFilterDropdownProps) => {
    return <DetailTableDropdown {...props} key={dataIndex} options={options} />;
  };

// exported for tests
export const _onCell = (dataIndex: string) => (row: TRow) => {
  const cellData = row[dataIndex];
  if (!cellData || typeof cellData !== 'object' || Array.isArray(cellData)) return {};
  const { styling } = cellData;
  if (_isEmpty(styling)) return {};
  return {
    style: styling,
  };
};

// exported for tests
export const _onFilter = (dataIndex: string) => (value: React.Key | boolean, row: TRow) => {
  const data = row[dataIndex];
  if (typeof data === 'object' && !Array.isArray(data) && typeof data.value === 'string') {
    return data.value === value;
  }
  return data === value;
};

// exported for tests
export const _renderCell = (cellData: undefined | string | TStyledValue) => {
  if (!cellData || typeof cellData !== 'object') return cellData;
  if (Array.isArray(cellData)) return <ExamplesLink examples={cellData} />;
  if (!cellData.linkTo) return cellData.value;
  return (
    <a href={cellData.linkTo} target="_blank" rel="noopener noreferrer">
      {cellData.value}
    </a>
  );
};

// exported for tests
export const _sort = (dataIndex: string) => (a: TRow, b: TRow) => {
  const aData = a[dataIndex];
  let aValue;
  if (Array.isArray(aData)) aValue = aData.length;
  else if (typeof aData === 'object' && typeof aData.value === 'string') aValue = aData.value;
  else aValue = aData;

  const bData = b[dataIndex];
  let bValue;
  if (Array.isArray(bData)) bValue = bData.length;
  else if (typeof bData === 'object' && typeof bData.value === 'string') bValue = bData.value;
  else bValue = bData;

  if (aValue < bValue) return -1;
  return bValue < aValue ? 1 : 0;
};

// exported for tests
export const _makeColumns = ({ defs, rows }: { defs: TColumnDefs; rows: TRow[] }) =>
  defs.map((def: TColumnDef | string) => {
    let dataIndex: string;
    let key: string;
    let sortable = true;
    let style: React.CSSProperties | undefined;
    let title: string;
    if (typeof def === 'string') {
      key = title = dataIndex = def;
    } else {
      key = title = dataIndex = def.key;
      if (def.label) title = def.label;
      if (def.styling) style = def.styling;
      if (def.preventSort) sortable = false;
    }

    const options = new Set<string>();
    rows.forEach(row => {
      const value = row[dataIndex];
      if (typeof value === 'string' && value) options.add(value);
      else if (typeof value === 'object' && !Array.isArray(value) && typeof value.value === 'string') {
        options.add(value.value);
      }
    });

    return {
      dataIndex,
      key,
      title,
      filterDropdown: Boolean(options.size) && _makeFilterDropdown(dataIndex, options),
      filterIcon: (filtered: boolean) => {
        if (filtered) return <IoFunnel />;
        return <IoFunnelOutline />;
      },
      onCell: _onCell(dataIndex),
      onHeaderCell: () => ({
        style,
      }),
      onFilter: _onFilter(dataIndex),
      render: _renderCell,
      sorter: sortable && _sort(dataIndex),
    };
  });

// exported for tests
export const _rowKey = (row: TRow) =>
  JSON.stringify(
    row,
    function replacer(key: string, value: TRow | undefined | string | number | TStyledValue | TExample[]) {
      function isRow(v: typeof value): v is TRow {
        return v === row;
      }
      if (isRow(value)) return value;
      if (Array.isArray(value)) return JSON.stringify(value);
      if (typeof value === 'object') {
        if (typeof value.value === 'string') return JSON.stringify(value);
        return value.value.key || 'Unknown';
      }
      return value;
    }
  );

export default function DetailTable({
  columnDefs: _columnDefs,
  details,
}: {
  columnDefs?: TColumnDefs;
  details: TRow[];
}) {
  const columnDefs: TColumnDefs = _columnDefs ? _columnDefs.slice() : [];
  const knownColumns = new Set(
    columnDefs.map(keyOrObj => {
      if (typeof keyOrObj === 'string') return keyOrObj;
      return keyOrObj.key;
    })
  );
  details.forEach(row => {
    Object.keys(row).forEach((col: string) => {
      if (!knownColumns.has(col)) {
        knownColumns.add(col);
        columnDefs.push(col);
      }
    });
  });

  return (
    <Table
      key="table"
      size="middle"
      columns={_makeColumns({ defs: columnDefs, rows: details })}
      dataSource={details}
      pagination={false}
      rowKey={_rowKey}
    />
  );
}
