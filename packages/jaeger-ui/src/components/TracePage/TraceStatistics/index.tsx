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
import { ColumnProps, CompareFn } from 'antd/es/table';
import { Trace } from '../../../types/trace';
import TraceStatisticsHeader from './TraceStatisticsHeader';
import { ITableSpan } from './types';
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

const columnsArray: any[] = [
  {
    title: 'Name',
    attribute: 'name',
    suffix: '',
  },
  {
    title: 'Count',
    attribute: 'count',
    suffix: '',
  },
  {
    title: 'Total',
    attribute: 'total',
    suffix: 'ms',
  },
  {
    title: 'Avg',
    attribute: 'avg',
    suffix: 'ms',
  },
  {
    title: 'Min',
    attribute: 'min',
    suffix: 'ms',
  },
  {
    title: 'Max',
    attribute: 'max',
    suffix: 'ms',
  },
  {
    title: 'ST Total',
    attribute: 'selfTotal',
    suffix: 'ms',
  },
  {
    title: 'ST Avg',
    attribute: 'selfAvg',
    suffix: 'ms',
  },
  {
    title: 'ST Min',
    attribute: 'selfMin',
    suffix: 'ms',
  },
  {
    title: 'ST Max',
    attribute: 'selfMax',
    suffix: 'ms',
  },
  {
    title: 'ST in Duration',
    attribute: 'percent',
    suffix: '%',
  },
];

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
      if (!allTableSpansChange[i].isDetail && allTableSpansChange[i].hasSubgroupValue) {
        allTableSpansChange[i].searchColor = 'transparent';
      } else if (allTableSpansChange[i].hasSubgroupValue) {
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
    const onClickOption = (hasSubgroupValue: boolean, name: string) => {
      if (this.state.valueNameSelector1 === 'sql.query' && hasSubgroupValue) this.togglePopup(name);
    };

    const sorterFunction = <T extends keyof ITableSpan>(field: T): CompareFn<ITableSpan> => {
      const sort = (a: ITableSpan, b: ITableSpan) => {
        if (!a.hasSubgroupValue) {
          return 0;
        }
        if (!b.hasSubgroupValue) {
          return -1;
        }
        if (field === 'name') {
          return (a[field] as string).localeCompare(b[field] as string);
        }
        return (a[field] as number) - (b[field] as number);
      };
      return sort;
    };

    const onCellFunction = (record: ITableSpan) => {
      const backgroundColor =
        this.props.uiFind && record.searchColor !== 'transparent'
          ? record.searchColor
          : record.colorToPercent;
      return {
        style: { background: backgroundColor, borderColor: backgroundColor },
      };
    };

    const columns: ColumnProps<ITableSpan>[] = columnsArray.map(val => {
      const renderFunction = (cell: string, row: ITableSpan) => {
        if (val.attribute === 'name')
          return (
            <span
              role="button"
              onClick={() => onClickOption(row.hasSubgroupValue, row.name)}
              style={{
                borderLeft: `4px solid ${row.color || `transparent`}`,
                padding: '7px 0px 7px 10px',
                cursor: 'default',
              }}
            >
              {cell}
            </span>
          );
        return `${cell}${val.suffix}`;
      };
      const ele = {
        title: val.title,
        dataIndex: val.attribute,
        sorter: sorterFunction(val.attribute),
        render: renderFunction,
        onCell: onCellFunction,
      };
      return val.attribute === 'count' ? { ...ele, defaultSortOrder: 'ascend' } : ele;
    });
    /**
     * Pre-process the table data into groups and sub-groups
     */
    const groupAndSubgroupSpanData = (tableValue: ITableSpan[]): ITableSpan[] => {
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
    const groupedAndSubgroupedSpanData: ITableSpan[] = groupAndSubgroupSpanData(this.state.tableValue);
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
          dataSource={groupedAndSubgroupedSpanData}
          pagination={{
            total: groupedAndSubgroupedSpanData.length,
            pageSizeOptions: ['10', '20', '50', '100'],
            showSizeChanger: true,
            showQuickJumper: true,
          }}
          rowClassName={row =>
            !row.hasSubgroupValue ? 'undefClass--TraceStatistics' : 'MainTableData--TraceStatistics'
          }
          key={groupedAndSubgroupedSpanData.length}
          defaultExpandAllRows
          sortDirections={['ascend', 'descend', 'ascend']}
        />
      </div>
    );
  }
}
