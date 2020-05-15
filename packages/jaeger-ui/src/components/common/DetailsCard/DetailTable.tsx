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
import { Button, Icon, Table } from 'antd';
import FaCheck from 'react-icons/lib/fa/check.js';
import FaFilter from 'react-icons/lib/fa/filter.js';
import FaTrash from 'react-icons/lib/fa/trash.js';
import TiCancel from 'react-icons/lib/ti/cancel.js';
import _isEmpty from 'lodash/isEmpty';

import ExamplesLink, { TExample } from '../ExamplesLink';
import FilteredList from '../FilteredList';

import { TColumnDef, TColumnDefs, TRow, TStyledValue } from './types';

import './DetailTableDropdown.css'

// TODO Move
type TFilterDropdownProps = {
  setSelectedKeys: (selectedKeys: React.Key[]) => void;
  selectedKeys: React.Key[];
  confirm: () => void;
  clearFilters?: () => void;
}

type TProps = TFilterDropdownProps & {
  dataIndex: string;
  rows: TRow[];
};

class Dropdown extends React.PureComponent<TProps> {
  cancelled = false;
  selected: Array<React.Key> = [];

  constructor(props: TProps) {
    super(props);
    this.selected = props.selectedKeys;
  }

  componentDidUpdate() {
    if (this.cancelled) {
      this.cancelled = false;
      this.props.confirm();
    };
  }

  cancel = () => {
    this.cancelled = true;
    this.props.setSelectedKeys(this.selected);
  }

  confirm = () => {
    this.selected = this.props.selectedKeys;
    this.props.confirm();
  }

  render() {
    const { clearFilters = () => {}, dataIndex, rows, selectedKeys, setSelectedKeys } = this.props;

    const options = new Set<string>();
    rows.forEach(row => {
      const value = row[dataIndex];
      if (typeof value === 'string' && value) options.add(value);
      else if (typeof value === 'object' && !Array.isArray(value) && typeof value.value === 'string') options.add(value.value);
    });

    const value = new Set<string>();
    selectedKeys.forEach(selected => {
      if (typeof selected === 'string') value.add(selected);
    });

    // TODO: Close on scroll? or fix scroll bug
    return (
      <div>
        <FilteredList
          addValues={(values: string[]) => {
            setSelectedKeys([...selectedKeys, ...values]);
          }}
          multi
          options={Array.from(options)}
          removeValues={(values: string[]) => {
            const remove = new Set<React.Key>(values);
            setSelectedKeys(selectedKeys.filter(key => !remove.has(key)));
          }}
          setValue={(value: string) => {
            setSelectedKeys([value]);
          }}
          value={value}
        />
        <div className="DetailDropdown--Footer">
          <Button className="DetailDropdown--Btn Clear" onClick={clearFilters}>
            <FaTrash size={18} />
            Clear Filter
          </Button>
          <div className="DetailDropdown--Footer--CancelConfirm">
            <Button className="DetailDropdown--Btn Cancel" onClick={this.cancel}>
              <TiCancel size={20} />
              Cancel 
            </Button>
            <Button className="DetailDropdown--Btn Apply" onClick={this.confirm}>
              <FaCheck size={18} />
              Apply
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

// exported for tests
export const _makeFilterDropdown = (dataIndex: string, rows: TRow[]) => (props: TFilterDropdownProps) => {
  return <Dropdown
    {...props}
    key={dataIndex}
    dataIndex={dataIndex}
    rows={rows}
  />;
  /*
  const { clearFilters = () => {}, confirm, selectedKeys, setSelectedKeys } = props;
  console.log(props.filters);

  const options = new Set<string>();
  rows.forEach(row => {
    const value = row[dataIndex];
    if (typeof value === 'string' && value) options.add(value);
    else if (typeof value === 'object' && !Array.isArray(value) && typeof value.value === 'string') options.add(value.value);
  });

  const value = new Set<string>();
  selectedKeys.forEach(selected => {
    if (typeof selected === 'string') value.add(selected);
  });

  // TODO: Close on scroll? or fix scroll bug
  return (
    <div>
      <FilteredList
        addValues={(values: string[]) => {
          setSelectedKeys([...selectedKeys, ...values]);
        }}
        multi
        options={Array.from(options)}
        removeValues={(values: string[]) => {
          const remove = new Set<React.Key>(values);
          console.log(values, 'remove');
          setSelectedKeys(selectedKeys.filter(key => !remove.has(key)));
        }}
        setValue={(value: string) => {
          setSelectedKeys([value]);
        }}
        value={value}
      />
      <div>
        <Button onClick={clearFilters}>
          <FaTrash />
          Clear Filter
        </Button>
        <div>
          <Button onClick={() => {
            setSelectedKeys([]);
            document.dispatchEvent(CLOSE_EVENT);
          }}>
            Cancel 
          </Button>
          <Button onClick={confirm}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
 */
};


// exported for tests
export const _onCell = (dataIndex: string) => (row: TRow) => {
  const cellData = row[dataIndex];
  if (!cellData || typeof cellData !== 'object' || Array.isArray(cellData)) return null;
  const { styling } = cellData;
  if (_isEmpty(styling)) return null;
  return {
    style: styling,
  };
};

// exported for tests
export const _onFilter = (dataIndex: string) => (value: string, row: TRow) => {
  const data = row[dataIndex];
  // console.log(value, data);
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
export const _makeColumns = ({ defs, rows }: { defs: TColumnDefs, rows: TRow[] }) =>
  defs.map((def: TColumnDef | string) => {
    let dataIndex: string;
    let key: string;
    let sortable: boolean = true;
    let style: React.CSSProperties | undefined;
    let title: string;
    if (typeof def === 'string') {
      // eslint-disable-next-line no-multi-assign
      key = title = dataIndex = def;
    } else {
      // eslint-disable-next-line no-multi-assign
      key = title = dataIndex = def.key;
      if (def.label) title = def.label;
      if (def.styling) style = def.styling;
      if (def.preventSort) sortable = false;
    }

    return {
      dataIndex,
      key,
      title,
      filterDropdown: _makeFilterDropdown(dataIndex, rows),
      filterIcon: (filtered: boolean) => {
        if (filtered) return <FaFilter />;
        return <Icon type="filter" />;
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
  JSON.stringify(row, function replacer(
    key: string,
    value: TRow | undefined | string | number | TStyledValue | TExample[]
  ) {
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
  });

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
      {...{} /*scroll={{ y: 240 }}*/}
      columns={_makeColumns({ defs: columnDefs, rows: details })}
      dataSource={details}
      pagination={false}
      rowKey={_rowKey}
    />
  );
}
