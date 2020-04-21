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
import HeaderTable from './HeaderTable';
import MainTableData from './MainTableData';
import DetailTableData from './DetailTableData';
import TraceStatisticsHeader from './TraceStatisticsHeader';
import { ITableSpan } from './types';
import sortTable from './sortTable';
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
    this.sortClick = this.sortClick.bind(this);
    this.togglePopup = this.togglePopup.bind(this);
    this.clickColumn = this.clickColumn.bind(this);

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
          this.sortTableWithOthers(tableValue, 1, false),
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
   * Searches for the others of the share and sorts afterwards.
   */
  sortTableWithOthers = (tableValue: ITableSpan[], sortIndex: number, sortAsc: boolean) => {
    let rememberIndexNoDetail = -1;
    let rememberIndex = -1;
    let othersInDetail = false;
    let sortArray = [];
    const sortArray2 = [];
    let i;

    for (i = 0; i < tableValue.length; i++) {
      if (tableValue[i].type !== 'undefined') {
        sortArray.push(tableValue[i]);
      } else if (!tableValue[i].isDetail) {
        rememberIndexNoDetail = i;
      } else {
        othersInDetail = true;
      }
    }
    sortArray = sortTable(sortArray, columnsArray[sortIndex].attribute, sortAsc);
    if (rememberIndexNoDetail !== -1) {
      sortArray.push(tableValue[rememberIndexNoDetail]);
    }

    if (!othersInDetail) {
      return sortArray;
    }

    let parentElements = [];
    for (i = 0; i < tableValue.length; i++) {
      if (!tableValue[i].isDetail) {
        parentElements.push(tableValue[i]);
      }
    }
    parentElements = sortTable(parentElements, columnsArray[sortIndex].attribute, sortAsc);
    for (i = 0; i < parentElements.length; i++) {
      sortArray2.push(parentElements[i]);
      let tempArray = [];
      for (let j = 0; j < tableValue.length; j++) {
        if (parentElements[i].name === tableValue[j].parentElement && tableValue[j].type !== 'undefined') {
          tempArray.push(tableValue[j]);
        } else if (
          parentElements[i].name === tableValue[j].parentElement &&
          tableValue[j].type === 'undefined'
        ) {
          rememberIndex = j;
        }
      }
      tempArray = sortTable(tempArray, columnsArray[sortIndex].attribute, sortAsc);
      if (rememberIndex !== -1) {
        tempArray.push(tableValue[rememberIndex]);
        rememberIndex = -1;
      }
      for (let j = 0; j < tempArray.length; j++) {
        sortArray2.push(tempArray[j]);
      }
    }
    return sortArray2;
  };

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
   * Change the sortButton an calls the sort function.
   * @param index the index of the clicked column
   */
  sortClick(index: number) {
    const { tableValue, sortIndex, sortAsc } = this.state;
    if (sortIndex !== index) {
      this.setState(prevState => {
        return {
          ...prevState,
          sortIndex: index,
          sortAsc: false,
          tableValue: this.sortTableWithOthers(tableValue, index, false),
        };
      });
    } else {
      this.setState(prevState => {
        return {
          ...prevState,
          sortAsc: !sortAsc,
          tableValue: this.sortTableWithOthers(tableValue, index, !sortAsc),
        };
      });
    }
  }

  /**
   * Hides the child at the first click.
   */
  clickColumn(selectedSpan: string) {
    if (this.state.valueNameSelector2 !== null) {
      let add = true;
      const actualTable = this.state.tableValue;
      let newTable = [];
      for (let i = 0; i < actualTable.length; i++) {
        if (actualTable[i].parentElement === selectedSpan) {
          add = false;
        }
        if (actualTable[i].parentElement !== selectedSpan) {
          newTable.push(actualTable[i]);
        }
      }
      if (add) {
        newTable = [];
        for (let i = 0; i < actualTable.length; i++) {
          if (actualTable[i].name !== selectedSpan) {
            newTable.push(actualTable[i]);
          } else {
            newTable.push(actualTable[i]);
            for (let j = 0; j < this.state.wholeTable.length; j++) {
              if (this.state.wholeTable[j].parentElement === selectedSpan) {
                newTable.push(this.state.wholeTable[j]);
              }
            }
          }
        }
        newTable = this.searchInTable(this.props.uiFindVertexKeys!, newTable, this.props.uiFind);
        newTable = this.sortTableWithOthers(newTable, this.state.sortIndex, this.state.sortAsc);
      }
      this.setState({
        tableValue: newTable,
      });
    }
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

  renderTableData() {
    return this.state.tableValue.map(oneSpan => {
      const {
        count,
        total,
        avg,
        min,
        max,
        selfTotal,
        selfAvg,
        selfMin,
        selfMax,
        percent,
        color,
        searchColor,
        colorToPercent,
      } = oneSpan;
      const values: any[] = [count, total, avg, min, max, selfTotal, selfAvg, selfMin, selfMax, percent];
      const uid = _.uniqueId('id');
      if (!oneSpan.isDetail) {
        return (
          <MainTableData
            key={uid}
            type={oneSpan.type}
            name={oneSpan.name}
            searchColor={searchColor}
            values={values}
            columnsArray={columnsArray}
            togglePopup={this.togglePopup}
            valueNameSelector1={this.state.valueNameSelector1}
            valueNameSelector2={this.state.valueNameSelector2}
            color={color}
            clickColumn={this.clickColumn}
            colorToPercent={colorToPercent}
          />
        );
      }
      return (
        <DetailTableData
          key={uid}
          type={oneSpan.type}
          name={oneSpan.name}
          searchColor={searchColor}
          values={values}
          columnsArray={columnsArray}
          color={color}
          togglePopup={this.togglePopup}
          valueNameSelector2={this.state.valueNameSelector2}
          colorToPercent={colorToPercent}
        />
      );
    });
  }

  renderTableHead() {
    const { sortAsc, sortIndex } = this.state;
    return (
      <tr>
        {columnsArray.map((element: any, index: number) => (
          <HeaderTable
            element={element}
            key={element.title}
            sortIndex={sortIndex}
            index={index}
            sortClick={this.sortClick}
            sortAsc={sortAsc}
          />
        ))}
      </tr>
    );
  }

  render() {
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
        <table className="test1893">
          <tbody className="DetailTraceTableTbody--TraceStatistics">
            {this.renderTableHead()}
            {this.renderTableData()}
          </tbody>
        </table>
      </div>
    );
  }
}
