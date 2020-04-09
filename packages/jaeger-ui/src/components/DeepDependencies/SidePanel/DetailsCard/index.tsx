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
import _isEmpty from 'lodash/isEmpty';

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
  columnDefs?: TPadColumnDefs;
  description?: string;
  details: TPadDetails;
  header: string;
};

function isList(arr: string[] | TPadRow[]): arr is string[] {
  return typeof arr[0] === 'string';
}

export default class DetailsCard extends React.PureComponent<TProps> {
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
      sorter: (a: TPadRow, b: TPadRow) => {
        const aData = a[dataIndex];
        const aValue = typeof aData === 'object' && aData.value !== undefined ? aData.value : aData;
        const bData = b[dataIndex];
        const bValue = typeof bData === 'object' && bData.value !== undefined ? bData.value : bData;
        if (aValue < bValue) return -1;
        return bValue < aValue ? 1 : 0;
      },
    };

    return <Column {...props} />;
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
        rowKey={(row: TPadRow) => JSON.stringify(row)}
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

  render() {
    const { className, description, header } = this.props;

    return (
      <div className={`DetailsCard ${className}`}>
        <div>
          <span className="DetailsCard--Header">{header}</span>
          {description && <p>{description}</p>}
        </div>
        <div className="DetailsCard--DetailsWrapper">{this.renderDetails()}</div>
      </div>
    );
  }
}
