// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { Component } from 'react';
import './index.css';
import { Table } from 'antd';
import { ColumnProps } from 'antd/es/table';
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

const columnsArray: {
  title: string;
  attribute: keyof ITableSpan;
  suffix: string;
  titleDescription?: string;
}[] = [
  {
    title: 'Group',
    attribute: 'name',
    suffix: '',
  },
  {
    title: 'Count',
    attribute: 'count',
    suffix: '',
    titleDescription: 'Number of spans',
  },
  {
    title: 'Total',
    attribute: 'total',
    suffix: 'ms',
    titleDescription: 'Total duration of all spans',
  },
  {
    title: 'Avg',
    attribute: 'avg',
    suffix: 'ms',
    titleDescription: 'Average duration of all spans',
  },
  {
    title: 'Min',
    attribute: 'min',
    suffix: 'ms',
    titleDescription: 'Minimum duration across all spans',
  },
  {
    title: 'Max',
    attribute: 'max',
    suffix: 'ms',
    titleDescription: 'Maximum duration across all spans',
  },
  {
    title: 'ST Total',
    attribute: 'selfTotal',
    suffix: 'ms',
    titleDescription: 'Sum of Self Time (time spent in a span when it was not waiting on children)',
  },
  {
    title: 'ST Avg',
    attribute: 'selfAvg',
    suffix: 'ms',
    titleDescription: 'Average Self Time (time spent in a span when it was not waiting on children)',
  },
  {
    title: 'ST Min',
    attribute: 'selfMin',
    suffix: 'ms',
    titleDescription: 'Minimum Self Time (time spent in a span when it was not waiting on children)',
  },
  {
    title: 'ST Max',
    attribute: 'selfMax',
    suffix: 'ms',
    titleDescription: 'Maximum Self Time (time spent in a span when it was not waiting on children)',
  },
  {
    title: 'ST in Duration',
    attribute: 'percent',
    suffix: '%',
    titleDescription: 'Percentage of ST Total vs. Total',
  },
];

/**
 * Trace Tag Overview Component
 */
export default class TraceStatistics extends Component<Props, State> {
  constructor(props: Props) {
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
  componentDidUpdate(props: Props) {
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
   * @param uiFindVertexKeys Set of span IDs that matched the search
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

    // Reset all colors to default
    for (let i = 0; i < allTableSpansChange.length; i++) {
      if (!allTableSpansChange[i].isDetail && allTableSpansChange[i].hasSubgroupValue) {
        allTableSpansChange[i].searchColor = 'transparent';
      } else if (allTableSpansChange[i].hasSubgroupValue) {
        allTableSpansChange[i].searchColor = defaultGrayCollor;
      } else {
        allTableSpansChange[i].searchColor = defaultGrayCollor;
      }
    }

    // Highlight table rows based on matched span IDs
    if (typeof uiFindVertexKeys !== 'undefined' && uiFindVertexKeys.size > 0) {
      // Build a set of table row names that contain matched spans
      const matchedRowNames = new Set<string>();
      const matchedParentElements = new Set<string>();

      // Iterate through all spans in the trace
      const { spans } = this.props.trace;
      for (let spanIndex = 0; spanIndex < spans.length; spanIndex++) {
        const span = spans[spanIndex];

        // Check if this span is in the matched set
        if (uiFindVertexKeys.has(span.spanID)) {
          // Determine which table rows this span belongs to based on current grouping
          const { valueNameSelector1, valueNameSelector2 } = this.state;

          // First level grouping
          if (valueNameSelector1 === 'Service Name') {
            matchedRowNames.add(span.process.serviceName);
            if (valueNameSelector2 === 'Operation Name') {
              matchedRowNames.add(span.operationName);
              matchedParentElements.add(span.process.serviceName);
            }
          } else if (valueNameSelector1 === 'Operation Name') {
            matchedRowNames.add(span.operationName);
            if (valueNameSelector2 === 'Service Name') {
              matchedRowNames.add(span.process.serviceName);
              matchedParentElements.add(span.operationName);
            }
          } else {
            // Custom tag grouping
            for (let tagIndex = 0; tagIndex < span.tags.length; tagIndex++) {
              const tag = span.tags[tagIndex];
              if (tag.key === valueNameSelector1) {
                matchedRowNames.add(tag.value.toString());
              }
              if (valueNameSelector2 && tag.key === valueNameSelector2) {
                matchedRowNames.add(tag.value.toString());
                // Find parent for this detail row
                for (let parentTagIndex = 0; parentTagIndex < span.tags.length; parentTagIndex++) {
                  const parentTag = span.tags[parentTagIndex];
                  if (parentTag.key === valueNameSelector1) {
                    matchedParentElements.add(parentTag.value.toString());
                  }
                }
              }
            }
          }
        }
      }

      // Apply highlighting to matching table rows
      for (let i = 0; i < allTableSpansChange.length; i++) {
        const rowName = allTableSpansChange[i].name;
        const parentElement = allTableSpansChange[i].parentElement;

        if (matchedRowNames.has(rowName)) {
          if (parentElement === 'none' || matchedParentElements.has(parentElement)) {
            allTableSpansChange[i].searchColor = yellowSearchCollor;
          }
        }
      }
    }

    // Handle text-based search (uiFind) - independent of span ID matching
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

    const sorterFunction = <T extends keyof ITableSpan>(field: T) => {
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
        showSorterTooltip: val.attribute !== 'name' ? { title: val.titleDescription } : false,
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
