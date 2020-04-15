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
import { List, Table } from 'antd';
import cx from 'classnames';
import _isEmpty from 'lodash/isEmpty';
import MdKeyboardArrowDown from 'react-icons/lib/md/keyboard-arrow-down';

import {
  TPadColumnDef,
  TPadColumnDefs,
  TPadDetails,
  TPadRow,
  TStyledValue,
} from '../../../../model/path-agnostic-decorations/types';

import './index.css';

const { Column } = Table;
const { Item } = List;

type TProps = {
  className?: string;
  collapsible?: boolean;
  columnDefs?: TPadColumnDefs;
  description?: string;
  details: TPadDetails;
  header: string;
};

type TState = {
  collapsed: boolean;
};

function isList(arr: string[] | TPadRow[]): arr is string[] {
  return typeof arr[0] === 'string';
}

export default class DetailsCard extends React.PureComponent<TProps> {
  state: TState;

  static renderList(details: string[]) {
    return (
      <List
        dataSource={details}
        renderItem={(s: string) => (
          <Item>
            <span>{s}</span>
          </Item>
        )}
      />
    );
  }

  static renderColumn(def: TPadColumnDef | string) {
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

    const props = {
      dataIndex,
      key,
      title,
      onCell: (row: TPadRow) => {
        const cellData = row[dataIndex];
        if (!cellData || typeof cellData !== 'object') return null;
        const { styling } = cellData;
        if (_isEmpty(styling)) return null;
        return {
          style: styling,
        };
      },
      onHeaderCell: () => ({
        style,
      }),
      render: (cellData: undefined | string | TStyledValue) => {
        if (!cellData || typeof cellData !== 'object') return cellData;
        if (!cellData.linkTo) return cellData.value;
        return (
          <a href={cellData.linkTo} target="_blank" rel="noopener noreferrer">
            {cellData.value}
          </a>
        );
      },
      sorter:
        sortable &&
        ((a: TPadRow, b: TPadRow) => {
          const aData = a[dataIndex];
          const aValue = typeof aData === 'object' && typeof aData.value === 'string' ? aData.value : aData;
          const bData = b[dataIndex];
          const bValue = typeof bData === 'object' && typeof bData.value === 'string' ? bData.value : bData;
          if (aValue < bValue) return -1;
          return bValue < aValue ? 1 : 0;
        }),
    };

    return <Column {...props} />;
  }

  constructor(props: TProps) {
    super(props);

    this.state = { collapsed: Boolean(props.collapsible) };
  }

  renderTable(details: TPadRow[]) {
    const { columnDefs: _columnDefs } = this.props;
    const columnDefs: TPadColumnDefs = _columnDefs ? _columnDefs.slice() : [];
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
        dataSource={details}
        pagination={false}
        rowKey={(row: TPadRow) =>
          JSON.stringify(row, function replacer(
            key: string,
            value: TPadRow | string | number | TStyledValue
          ) {
            function isRow(v: typeof value): v is TPadRow {
              return v === row;
            }
            if (isRow(value)) return value;
            if (typeof value === 'object') {
              if (typeof value.value === 'string') return value.value;
              return value.value.key || 'Unknown';
            }
            return value;
          })
        }
      >
        {columnDefs.map(DetailsCard.renderColumn)}
      </Table>
    );
  }

  renderDetails() {
    const { details } = this.props;

    if (Array.isArray(details)) {
      if (details.length === 0) return null;

      if (isList(details)) return DetailsCard.renderList(details);
      return this.renderTable(details);
    }

    return <span>{details}</span>;
  }

  toggleCollapse = () => {
    this.setState((prevState: TState) => ({
      collapsed: !prevState.collapsed,
    }));
  };

  render() {
    const { collapsed } = this.state;
    const { className, collapsible, description, header } = this.props;

    // TODO: Collapsible
    return (
      <div className={cx('DetailsCard', className)}>
        <div className="DetailsCard--ButtonHeaderWrapper">
          {collapsible && (
            <button
              onClick={this.toggleCollapse}
              type="button"
              className={cx('DetailsCard--Collapser', { 'is-collapsed': collapsed })}
            >
              <MdKeyboardArrowDown />
            </button>
          )}
          <div className="DetailsCard--HeaderWrapper">
            <span className="DetailsCard--Header">{header}</span>
            {description && <p className="DetailsCard--Description">{description}</p>}
          </div>
        </div>
        <div className={cx('DetailsCard--DetailsWrapper', { 'is-collapsed': collapsed })}>
          {this.renderDetails()}
        </div>
      </div>
    );
  }
}
