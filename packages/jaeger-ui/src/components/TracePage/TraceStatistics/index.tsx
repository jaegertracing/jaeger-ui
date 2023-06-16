// Copyright (c) 2020 The Jaeger Authors.
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

import React, { Component } from 'react';
import './index.css';
import { Table } from 'antd';
import { ColumnProps } from 'antd/es/table';
import { Trace } from '../../../types/trace';
import TraceStatisticsHeader from './TraceStatisticsHeader';
import { ITableSpan, ISorterInput } from './types';
import { TNil } from '../../../types';
import PopupSQL from './PopupSql';

type Props = {
  trace: Trace;
  uiFindVertexKeys: Set<string> | TNil;
  uiFind: string | null | undefined;
};

type State = {
  tableValue: ITableSpan[];
  sortIndex: number;
  sortAsc: boolean;
  showPopup: boolean;
  popupContent: string;
  wholeTable: ITableSpan[];
  valueNameSelector1: string;
  valueNameSelector2: string | null;
};

/**
 * Trace Tag Overview Component
 */
export default class TraceStatistics extends Component<Props, State> {
  constructor(props: any) {
    super(props);

    this.state = {
      tableValue: [],
      sortIndex: 1,
      sortAsc: false,
      showPopup: false,
      popupContent: '',
      wholeTable: [],
      valueNameSelector1: 'Service Name',
      valueNameSelector2: null,
    };

    this.handler = this.handler.bind(this);
    this.togglePopup = this.togglePopup.bind(this);

    this.searchInTable(this.props.uiFindVertexKeys!, this.state.tableValue, this.props.uiFind);
  }

  /**
   * If the search props change the search function is called.
   * @param props all props
   */
  componentDidUpdate(props: any) {
    if (this.props.uiFindVertexKeys !== props.uiFindVertexKeys) {
      this.changeTableValueSearch();
    }
  }

  changeTableValueSearch() {
    this.searchInTable(this.props.uiFindVertexKeys!, this.state.tableValue, this.props.uiFind);
    // reload the componente
    const tableValueState = this.state.tableValue;
    this.setState(prevState => ({
      ...prevState,
      tableValue: tableValueState,
    }));
  }

  /**
   * Is called from the child to change the state of the parent.
   * @param tableValue the values of the column
   */
  handler(
    tableValue: ITableSpan[],
    wholeTable: ITableSpan[],
    valueNameSelector1: string,
    valueNameSelector2: string | null
  ) {
    this.setState(prevState => {
      return {
        ...prevState,
        tableValue: this.searchInTable(this.props.uiFindVertexKeys!, tableValue, this.props.uiFind),
        sortIndex: 1,
        sortAsc: false,
        valueNameSelector1,
        valueNameSelector2,
        wholeTable,
      };
    });
  }

  /**
   * Open the popup button.
   * @param popupContent
   */
  togglePopup(popupContent: string) {
    const showPopupState = this.state.showPopup;
    this.setState(prevState => {
      return {
        ...prevState,
        showPopup: !showPopupState,
        popupContent,
      };
    });
  }

  /**
   * Colors found entries in the table.
   * @param uiFindVertexKeys Set of found spans
   * @param allTableSpans entries that are shown
   */
  searchInTable = (
    uiFindVertexKeys: Set<string>,
    allTableSpans: ITableSpan[],
    uiFind: string | null | undefined
  ) => {
    const allTableSpansChange = allTableSpans;
    const yellowSearchCollor = 'rgb(255,243,215)';
    const defaultGrayCollor = 'rgb(248,248,248)';
    for (let i = 0; i < allTableSpansChange.length; i++) {
      if (!allTableSpansChange[i].isDetail && allTableSpansChange[i].type !== 'undefined') {
        allTableSpansChange[i].searchColor = 'transparent';
      } else if (allTableSpansChange[i].type !== 'undefined') {
        allTableSpansChange[i].searchColor = defaultGrayCollor;
      } else {
        allTableSpansChange[i].searchColor = defaultGrayCollor;
      }
    }
    if (typeof uiFindVertexKeys !== 'undefined') {
      uiFindVertexKeys!.forEach(function calc(value) {
        const uiFindVertexKeysSplit = value.split('');

        for (let i = 0; i < allTableSpansChange.length; i++) {
          if (
            uiFindVertexKeysSplit[uiFindVertexKeysSplit.length - 1].indexOf(allTableSpansChange[i].name) !==
            -1
          ) {
            if (allTableSpansChange[i].parentElement === 'none') {
              allTableSpansChange[i].searchColor = yellowSearchCollor;
            } else if (
              uiFindVertexKeysSplit[uiFindVertexKeysSplit.length - 1].indexOf(
                allTableSpansChange[i].parentElement
              ) !== -1
            ) {
              allTableSpansChange[i].searchColor = yellowSearchCollor;
            }
          }
        }
      });
    }
    if (uiFind) {
      for (let i = 0; i < allTableSpansChange.length; i++) {
        if (allTableSpansChange[i].name.indexOf(uiFind!) !== -1) {
          allTableSpansChange[i].searchColor = yellowSearchCollor;

          for (let j = 0; j < allTableSpansChange.length; j++) {
            if (allTableSpansChange[j].parentElement === allTableSpansChange[i].name) {
              allTableSpansChange[j].searchColor = yellowSearchCollor;
            }
          }
          if (allTableSpansChange[i].isDetail) {
            for (let j = 0; j < allTableSpansChange.length; j++) {
              if (allTableSpansChange[i].parentElement === allTableSpansChange[j].name) {
                allTableSpansChange[j].searchColor = yellowSearchCollor;
              }
            }
          }
        }
      }
    }
    return allTableSpansChange;
  };

  render() {
    const onClickOption = (type: string, name: string) => {
      if (this.state.valueNameSelector1 === 'sql.query' && type !== 'undefined') this.togglePopup(name);
    };

    const sorterFunction = (a: ISorterInput, b: ISorterInput) => {
      if (a.type === 'undefined') {
        return 0;
      }
      if (b.type === 'undefined') {
        return -1;
      }
      if (typeof a.value === 'number' && typeof b.value === 'number') return a.value - b.value;
      return (a.value as string).localeCompare(b.value as string);
    };

    const onCellFunction = (record: ITableSpan) => {
      const backgroundColor = this.props.uiFind && record.searchColor !== 'transparent'?record.searchColor:record.colorToPercent;
      return {
        style: { background: backgroundColor, borderColor: backgroundColor },
      };
    };

    let columns: ColumnProps<ITableSpan>[] = [
      {
        title: 'Name',
        dataIndex: 'name',
        sorter: (a, b) => sorterFunction({ type: a.type, value: a.name }, { type: b.type, value: b.name }),
        render: (name: string, row: ITableSpan) => {
          return (
            <span
              onClick={() => onClickOption(row.type, row.name)}
              style={{
                borderLeft: `4px solid ${`${row.color}` || `transparent`}`,
                padding: '7px 0px 7px 10px',
                cursor: 'default',
              }}
            >
              {name}
            </span>
          );
        },
      },
      {
        title: 'Count',
        dataIndex: 'count',
        sorter: (a, b) => sorterFunction({ type: a.type, value: a.count }, { type: b.type, value: b.count }),
        defaultSortOrder: 'ascend',
      },
      {
        title: 'Total',
        dataIndex: 'total',
        sorter: (a, b) => sorterFunction({ type: a.type, value: a.total }, { type: b.type, value: b.total }),
        render: (cell: string) => {
          return `${cell} ms`;
        },
      },
      {
        title: 'Avg',
        dataIndex: 'avg',
        sorter: (a, b) => sorterFunction({ type: a.type, value: a.avg }, { type: b.type, value: b.avg }),
        render: (cell: string) => {
          return `${cell} ms`;
        },
      },
      {
        title: 'Min',
        dataIndex: 'min',
        sorter: (a, b) => sorterFunction({ type: a.type, value: a.min }, { type: b.type, value: b.min }),
        render: (cell: string) => {
          return `${cell} ms`;
        },
      },
      {
        title: 'Max',
        dataIndex: 'max',
        sorter: (a, b) => sorterFunction({ type: a.type, value: a.max }, { type: b.type, value: b.max }),
        render: (cell: string) => {
          return `${cell} ms`;
        },
      },
      {
        title: 'ST Total',
        dataIndex: 'selfTotal',
        sorter: (a, b) =>
          sorterFunction({ type: a.type, value: a.selfTotal }, { type: b.type, value: b.selfTotal }),
        render: (cell: string) => {
          return `${cell} ms`;
        },
      },
      {
        title: 'ST Avg',
        dataIndex: 'selfAvg',
        sorter: (a, b) =>
          sorterFunction({ type: a.type, value: a.selfAvg }, { type: b.type, value: b.selfAvg }),
        render: (cell: string) => {
          return `${cell} ms`;
        },
      },
      {
        title: 'ST Min',
        dataIndex: 'selfMin',
        sorter: (a, b) =>
          sorterFunction({ type: a.type, value: a.selfMin }, { type: b.type, value: b.selfMin }),
        render: (cell: string) => {
          return `${cell} ms`;
        },
      },
      {
        title: 'ST Max',
        dataIndex: 'selfMax',
        sorter: (a, b) =>
          sorterFunction({ type: a.type, value: a.selfMax }, { type: b.type, value: b.selfMax }),
        render: (cell: string) => {
          return `${cell} ms`;
        },
      },
      {
        title: 'ST in Duration',
        dataIndex: 'percent',
        sorter: (a, b) =>
          sorterFunction({ type: a.type, value: a.percent }, { type: b.type, value: b.percent }),
        render: (cell: string) => {
          return `${cell} %`;
        },
      },
    ];

    columns = columns.map(val => {
      return { ...val, onCell: record => onCellFunction(record) };
    });

    const findTablesAccToSelectors = (tableValue: ITableSpan[]): ITableSpan[] => {
      const withDetail: ITableSpan[] = tableValue.filter((val: ITableSpan) => val.isDetail);
      const withoutDetail: ITableSpan[] = tableValue.filter((val: ITableSpan) => !val.isDetail);
      for (let i = 0; i < withoutDetail.length; i++) {
        let newArr = withDetail.filter(value => value.parentElement === withoutDetail[i].name);
        newArr = newArr.map((value, index) => {
          const _key = {
            key: `${i}-${index}`,
          };
          const value2 = { ...value, ..._key };
          return value2;
        });
        const child = {
          key: i.toString(),
          children: newArr,
        };
        withoutDetail[i] = { ...withoutDetail[i], ...child };
      }
      return withoutDetail;
    };
    const withoutDetail: ITableSpan[] = findTablesAccToSelectors(this.state.tableValue);
    return (
      <div>
        <h3 className="title--TraceStatistics"> Trace Statistics</h3>

        <TraceStatisticsHeader
          trace={this.props.trace}
          tableValue={this.state.tableValue}
          wholeTable={this.state.wholeTable}
          handler={this.handler}
        />

        {this.state.showPopup ? (
          <PopupSQL closePopup={this.togglePopup} popupContent={this.state.popupContent} />
        ) : null}
        <Table
          className="span-table span-view-table"
          columns={columns}
          dataSource={withoutDetail}
          pagination={{
            total: withoutDetail.length,
            pageSizeOptions: ['10', '20', '50', '100'],
            showSizeChanger: true,
            showQuickJumper: true,
          }}
          rowClassName={row => {
            if (row.type === 'undefined') {
              return 'undefClass';
            }
            return 'MainTableData--tr';
          }}
          key={withoutDetail.length}
          defaultExpandAllRows
          sortDirections={['ascend', 'descend', 'ascend']}
        />
      </div>
    );
  }
}
