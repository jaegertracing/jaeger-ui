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

import * as _ from 'lodash';
import React, { Component } from 'react';
import './index.css';
import { Trace } from '../../../types/trace';
import TraceStatisticsHeader from './TraceStatisticsHeader';
import { ITableSpan } from './types';
import { TNil } from '../../../types';
import PopupSQL from './PopupSql';
import { Table } from 'antd';
import { ColumnProps } from 'antd/es/table';

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
    isDecimal: false,
  },
  {
    title: 'Count',
    attribute: 'count',
    suffix: '',
    isDecimal: false,
  },
  {
    title: 'Total',
    attribute: 'total',
    suffix: 'ms',
    isDecimal: true,
  },
  {
    title: 'Avg',
    attribute: 'avg',
    suffix: 'ms',
    isDecimal: true,
  },
  {
    title: 'Min',
    attribute: 'min',
    suffix: 'ms',
    isDecimal: true,
  },
  {
    title: 'Max',
    attribute: 'max',
    suffix: 'ms',
    isDecimal: true,
  },
  {
    title: 'ST Total',
    attribute: 'selfTotal',
    suffix: 'ms',
    isDecimal: true,
  },
  {
    title: 'ST Avg',
    attribute: 'selfAvg',
    suffix: 'ms',
    isDecimal: true,
  },
  {
    title: 'ST Min',
    attribute: 'selfMin',
    suffix: 'ms',
    isDecimal: true,
  },
  {
    title: 'ST Max',
    attribute: 'selfMax',
    suffix: 'ms',
    isDecimal: true,
  },
  {
    title: 'ST in Duration',
    attribute: 'percent',
    suffix: '%',
    isDecimal: true,
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
        tableValue: this.searchInTable(
          this.props.uiFindVertexKeys!,
          tableValue,
          this.props.uiFind
        ),
        sortIndex: 1,
        sortAsc: false,
        valueNameSelector1,
        valueNameSelector2,
        wholeTable,
      };
    });
  }

  /**
   * Opern the popup button.
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

    const onClickOption = (type:string,name:string) => {
      if(this.state.valueNameSelector1 === 'sql.query' && type !== 'undefined')
              this.togglePopup(name)
    }

    const columns: ColumnProps<ITableSpan>[] = [
      {
        title: 'Name',
        dataIndex: 'name',
        sorter: (a,b) => {
          if(a.type === 'undefined'){
            return -1
          }
          if(b.type === 'undefined'){
            return 1
          }
          return a.name.localeCompare(b.name)
        },
        render: (name: string,row: ITableSpan) => {
          if(!row.color){
            return <span onClick={()=>onClickOption(row.type,row.name)} style={{borderLeft: `4px solid transparent`,padding: "7px 0px 7px 10px",cursor: "default"}}>{name}</span>
          }
          return <span onClick={()=>onClickOption(row.type,row.name)} style={{borderLeft: `4px solid ${row.color}`,padding: "7px 0px 7px 10px",cursor: "default"}}>{name}</span>
        },
        onCell: (record,rowIndex) => {
          if(this.props.uiFind && record.searchColor !== 'transparent'){
            return{
              ['style']: {background: record.searchColor,borderColor: record.searchColor}
            }
          }
          return{
            ['style']: {background: record.colorToPercent,borderColor: record.colorToPercent}
          };
        }
      },
      {
        title: 'Count',
        dataIndex: 'count',
        sorter: (a, b) => {
          if(a.type === 'undefined'){
            return -1
          }
          if(b.type === 'undefined'){
            return 1
          }
          return a.count - b.count;
        },
        onCell: (record,rowIndex) => {
          if(this.props.uiFind && record.searchColor !== 'transparent'){
            return{
              ['style']: {background: record.searchColor,borderColor: record.searchColor}
            }
          }
          return{
            ['style']: {background: record.colorToPercent,borderColor: record.colorToPercent}
          };
        },
        defaultSortOrder: 'descend'
      },
      {
        title: 'Total',
        dataIndex: 'total',
        sorter: (a, b) => {
          if(a.type === 'undefined'){
            return -1
          }
          if(b.type === 'undefined'){
            return 1
          }
          return a.total - b.total
        },
        render: (cell: string) => {
              return cell+'ms'
        },
        onCell: (record,rowIndex) => {
          if(this.props.uiFind && record.searchColor !== 'transparent'){
            return{
              ['style']: {background: record.searchColor,borderColor: record.searchColor}
            }
          }
          return{
            ['style']: {background: record.colorToPercent,borderColor: record.colorToPercent}
          };
        }
      },
      {
        title: 'Avg',
        dataIndex: 'avg',
        sorter: (a, b) => {
          if(a.type === 'undefined'){
            return -1
          }
          if(b.type === 'undefined'){
            return 1
          }
          return a.avg - b.avg
        },
        render: (cell: string) => {
              return cell+'ms'
        },
        onCell: (record,rowIndex) => {
          if(this.props.uiFind && record.searchColor !== 'transparent'){
            return{
              ['style']: {background: record.searchColor,borderColor: record.searchColor}
            }
          }
          return{
            ['style']: {background: record.colorToPercent,borderColor: record.colorToPercent}
          };
        }
      },
      {
        title: 'Min',
        dataIndex: 'min',
        sorter: (a, b) => {
          if(a.type === 'undefined'){
            return -1
          }
          if(b.type === 'undefined'){
            return 1
          }
          return a.min - b.min
        },
        render: (cell: string) => {
              return cell+'ms'
        },
        onCell: (record,rowIndex) => {
          if(this.props.uiFind && record.searchColor !== 'transparent'){
            return{
              ['style']: {background: record.searchColor,borderColor: record.searchColor}
            }
          }
          return{
            ['style']: {background: record.colorToPercent,borderColor: record.colorToPercent}
          };
        }
      },
      {
        title: 'Max',
        dataIndex: 'max',
        sorter: (a, b) => {
          if(a.type === 'undefined'){
            return -1
          }
          if(b.type === 'undefined'){
            return 1
          }
          return a.max - b.max
        },
        render: (cell: string) => {
              return cell+'ms'
        },
        onCell: (record,rowIndex) => {
          if(this.props.uiFind && record.searchColor !== 'transparent'){
            return{
              ['style']: {background: record.searchColor,borderColor: record.searchColor}
            }
          }
          return{
            ['style']: {background: record.colorToPercent,borderColor: record.colorToPercent}
          };
        }
      },
      {
        title: 'ST Total',
        dataIndex: 'selfTotal',
        sorter: (a, b) => {
          if(a.type === 'undefined'){
            return -1
          }
          if(b.type === 'undefined'){
            return 1
          }
          return a.selfTotal - b.selfTotal
        },
        render: (cell: string) => {
              return cell+'ms'
        },
        onCell: (record,rowIndex) => {
          if(this.props.uiFind && record.searchColor !== 'transparent'){
            return{
              ['style']: {background: record.searchColor,borderColor: record.searchColor}
            }
          }
          return{
            ['style']: {background: record.colorToPercent,borderColor: record.colorToPercent}
          };
        }
      },
      {
        title: 'ST Avg',
        dataIndex: 'selfAvg',
        sorter: (a, b) => {
          if(a.type === 'undefined'){
            return -1
          }
          if(b.type === 'undefined'){
            return 1
          }
          return a.selfAvg - b.selfAvg
        },
        render: (cell: string) => {
              return cell+'ms'
        },
        onCell: (record,rowIndex) => {
          if(this.props.uiFind && record.searchColor !== 'transparent'){
            return{
              ['style']: {background: record.searchColor,borderColor: record.searchColor}
            }
          }
          return{
            ['style']: {background: record.colorToPercent,borderColor: record.colorToPercent}
          };
        }
      },
      {
        title: 'ST Min',
        dataIndex: 'selfMin',
        sorter: (a, b) => {
          if(a.type === 'undefined'){
            return -1
          }
          if(b.type === 'undefined'){
            return 1
          }
          return a.selfMin - b.selfMin
        },
        render: (cell: string) => {
              return cell+'ms'
        },
        onCell: (record,rowIndex) => {
          if(this.props.uiFind && record.searchColor !== 'transparent'){
            return{
              ['style']: {background: record.searchColor,borderColor: record.searchColor}
            }
          }
          return{
            ['style']: {background: record.colorToPercent,borderColor: record.colorToPercent}
          };
        }
      },
      {
        title: 'ST Max',
        dataIndex: 'selfMax',
        sorter: (a, b) => {
          if(a.type === 'undefined'){
            return -1
          }
          if(b.type === 'undefined'){
            return 1
          }
          return a.selfMax - b.selfMax
        },
        render: (cell: string) => {
              return cell+'ms'
        },
        onCell: (record,rowIndex) => {
          if(this.props.uiFind && record.searchColor !== 'transparent'){
            return{
              ['style']: {background: record.searchColor,borderColor: record.searchColor}
            }
          }
          return{
            ['style']: {background: record.colorToPercent,borderColor: record.colorToPercent}
          };
        }
      },
      {
        title: 'ST in Duration',
        dataIndex: 'percent',
        sorter: (a, b) => {
          if(a.type === 'undefined'){
            return -1
          }
          if(b.type === 'undefined'){
            return 1
          }
          return a.percent - b.percent
        },
        render: (cell: string) => {
              return cell+'%'
        },
        onCell: (record,rowIndex) => {
          if(this.props.uiFind && record.searchColor !== 'transparent'){
            return{
              ['style']: {background: record.searchColor,borderColor: record.searchColor}
            }
          }
          return{
            ['style']: {background: record.colorToPercent,borderColor: record.colorToPercent}
          };
        }
      },
    ];
    let isDetailArray: ITableSpan[] = [];
    let isNoDetail: ITableSpan[] = [];
  
    const findTablesAccToSelectors = (tableValue: ITableSpan[]) => {
      for (let i = 0; i < tableValue.length; i++) {
        if (tableValue[i].isDetail) {
          isDetailArray.push(tableValue[i]);
        } else {
          isNoDetail.push(tableValue[i]);
        }
      } 
      for(let i = 0; i < isNoDetail.length; i++){
          let newArr = isDetailArray.filter((value)=>{return ((value.parentElement) === (isNoDetail[i].name))})
          newArr = newArr.map((value,index)=>{
            const x = i.toString()+ index.toString();
            const keyo = {
              key: x
            }
            value = {...value,...keyo}
            return value
          })
          const child = {
            key: i.toString(),
            children: newArr
          }
          isNoDetail[i] = {...isNoDetail[i],...child}
      }
    }
    findTablesAccToSelectors(this.state.tableValue)
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
        {/* <table className="test1893">
          <tbody className="DetailTraceTableTbody--TraceStatistics">
            {this.renderTableHead()}
            {this.renderTableData()}
          </tbody>
        </table> */}
        <Table
            className="span-table span-view-table"
            columns={columns}
            dataSource={isNoDetail}
            pagination={{
              total: isNoDetail.length,
              pageSizeOptions: ['10', '20', '50', '100'],
              showSizeChanger: true,
              showQuickJumper: true,
            }}
            rowClassName={(record,index)=>{
              if(record.type === 'undefined'){
                return "undefClass"
              }
              return "MainTableData--tr" 
            }}
            key={isNoDetail.length}
            defaultExpandAllRows={true}
            sortDirections={['ascend', 'descend', 'ascend']}
            />
      </div>
    );
  }
}
