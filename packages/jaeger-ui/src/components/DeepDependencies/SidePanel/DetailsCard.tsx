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
// import _get from 'lodash/get';

import { TPadColumnDef, TPadColumnDefs, TPadDetails, TPadRow } from '../../../model/path-agnostic-decorations/types';
// import stringSupplant from '../../../utils/stringSupplant';

// import './DetailsTable.css';
//
//
const { Column } = Table;


type TProps = {
  columnDefs?: TPadColumnDefs;
  description?: string;
  details: TPadDetails;
  header: string;
};

export default class DetailsCard extends React.PureComponent<TProps> {
  /*
  static defaultProps = {
    columnDef: [],
  };
   */
  renderList(details: string[]) {
    return <span>Not yet implement</span>;
  }

  renderTable(details: TPadRow[]) {
    const { columnDefs: _columnDefs } = this.props;
    const columnDefs = _columnDefs ? _columnDefs.slice() : [];

    const knownColumns = new Set((columnDefs || []).map(keyOrObj => {
      if (typeof keyOrObj === 'string') return keyOrObj;
      return keyOrObj.key;
    }));
    details.forEach((row: any) => { // TODO def not any
      Object.keys(row).forEach((col: string) => {
        if (!knownColumns.has(col)) {
          knownColumns.add(col);
          columnDefs.push(col);
        };
      });
    });
    console.log(knownColumns);
    console.log(columnDefs);

    return (
      <Table
        key="table"
        size="middle"
        dataSource={details}
        rowKey="id"
        pagination={false}
      >
        {columnDefs.map((fdef: any) => {
          const def = fdef as unknown as any as (string | TPadColumnDef);
          if (typeof def === 'string') {
            const defString = def as string; // absolutely should not be necessary
            return (
              <Column
                key={defString}
                title={defString}
                dataIndex={defString}
                {...{} /*render={() => <span className="u-tx-muted">{defString}</span>}*/}
              />
            );
          }
          const defObj = def as TPadColumnDef;
          return (
            <Column
                key={defObj.key}
                title={defObj.label || defObj.key}
                dataIndex={defObj.key}
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

    let isTable = false;

    if (Array.isArray(details)) {
      if (details.length === 0) return null;

      if (typeof details[0] === 'string') return this.renderList(details as string[]);

      return this.renderTable(details as TPadRow[]);
    }

    return <span>details</span>;
  }

  render() {
    return (
      <div>
        <div>
          <span>{this.props.header}</span>
        </div>
        <p>{this.props.description}</p>
        {this.renderDetails()}
      </div>
    );
  }
}
