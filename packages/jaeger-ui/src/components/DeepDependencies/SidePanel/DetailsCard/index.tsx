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
// import _get from 'lodash/get';

import { TPadColumnDef, TPadColumnDefs, TPadDetails, TPadRow } from '../../../../model/path-agnostic-decorations/types';
// import stringSupplant from '../../../utils/stringSupplant';

import './index.css';
//
//
const { Column } = Table;
const { Item } = List;


type TProps = {
  columnDefs?: TPadColumnDefs;
  description?: string;
  details: TPadDetails;
  header: string;
};

function isList(arr: string[] | TPadRow[]): arr is string[] {
  return typeof arr[0] === 'string';
}

export default class DetailsCard extends React.PureComponent<TProps> {
  /*
  static defaultProps = {
    columnDef: [],
  };
   */
  renderList(details: string[]) {
    console.log(details);
    return (
      <List
        dataSource={details}
        renderItem={(s: string) => <Item><span>{s}</span></Item>}
      />
    );
  }

  renderTable(details: TPadRow[]) {
    const { columnDefs: _columnDefs } = this.props;
    const columnDefs: TPadColumnDefs = _columnDefs ? _columnDefs.slice() : [];
    const knownColumns = new Set(columnDefs.map(keyOrObj => {
      if (typeof keyOrObj === 'string') return keyOrObj;
      return keyOrObj.key;
    }));
    details.forEach(row => {
      Object.keys(row).forEach((col: string) => {
        if (!knownColumns.has(col)) {
          knownColumns.add(col);
          columnDefs.push(col);
        };
      });
    });

    const onCellObj = {
      onCell: (...args: any[]) => {
        console.log('on cell');
        console.log(...args);
        return ({
          style: {
            backgroundColor: 'red',
            color: 'white',
          },
        })
      },
      render: (...args: any[]) => {
        console.log('render');
        console.log(...args);
        return args[0];
      },
    };

    return (
      <Table
        key="table"
        size="middle"
        dataSource={details}
        rowKey="id"
        pagination={false}
      {...{} /* components={{
          body: {
            cell: (...args: any[]) => {
              console.log(args);
              return (
                <td>
                  hello
                  {args[0].children[2] && (args[0].children[2].value !== undefined && args[0].children[2].value) || args[0].children[2]}
                </td>
              );
            }
          }
                }} */ }
      >
        {columnDefs.map(def => {
          if (typeof def === 'string') {
            return (
              <Column
                key={def}
                {...onCellObj}
                sorter={(a: TPadRow, b: TPadRow) => {
                  return (a[def] < b[def] ? 1 : b[def] < a[def] ? -1 : 0);
                }}
                title={def}
                dataIndex={def}
                {...{} /*render={() => <span className="u-tx-muted">{defString}</span>}*/}
              />
            );
          }
          return (
            <Column
              key={def.key}
              sorter={(a: TPadRow, b: TPadRow) => {
                return a[def.key] < b[def.key] ? 1 : b[def.key] < a[def.key] ? -1 : 0;
              }}
              title={def.label || def.key}
              dataIndex={def.key}
              {...{} /*render={() => <span className="u-tx-muted">{defString}</span>}*/}
            />
          );
        })}
        </Table>
      );
  }

  renderDetails() {
    const { columnDefs: _columnDefs, details } = this.props;
    const columnDefs = _columnDefs ? _columnDefs.slice() : [];

    if (Array.isArray(details)) {
      if (details.length === 0) return null;

      if (isList(details)) return this.renderList(details);
      return this.renderTable(details);
    }

    return <span>{details}</span>;
  }

  render() {
    const { description, header } = this.props;

    return (
      <div className="DetailsCard">
        <div>
          <span className="DetailsCard--Header">{header}</span>
          {description && <p>{description}</p>}
        </div>
        <div className="DetailsCard--DetailsWrapper">
          {this.renderDetails()}
        </div>
      </div>
    );
  }
}
