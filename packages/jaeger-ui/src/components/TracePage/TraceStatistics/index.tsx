// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { Component } from 'react';
import './index.css';
import { Table, Tooltip } from 'antd';
import { ColumnProps } from 'antd/es/table';
import { IOtelTrace } from '../../../types/otel';
import TraceStatisticsHeader from './TraceStatisticsHeader';
import { ITableSpan } from './types';
import { TNil } from '../../../types';
import PopupSQL from './PopupSql';
import { getServiceName } from './tableValues';
import RelativeBar from '../../common/RelativeBar';
import { formatDurationCompact, ONE_MILLISECOND } from '../../../utils/date';
import { Microseconds } from '../../../types/units';

type Props = {
  trace: IOtelTrace;
  uiFindVertexKeys: Set<string> | TNil;
  uiFind: string | null | undefined;
  useOtelTerms: boolean;
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
  colorByAttribute: string;
};

type ColumnValueType = 'count' | 'percent' | 'time' | 'text';

const columnsArray: {
  title: string;
  attribute: keyof ITableSpan;
  suffix: string;
  valueType: ColumnValueType;
  titleDescription?: string;
}[] = [
  {
    title: 'Group',
    attribute: 'name',
    suffix: '',
    valueType: 'text',
  },
  {
    title: 'Count',
    attribute: 'count',
    suffix: '',
    valueType: 'count',
    titleDescription: 'Number of spans',
  },
  {
    title: 'Total',
    attribute: 'total',
    suffix: 'ms',
    valueType: 'time',
    titleDescription: 'Total duration of all spans',
  },
  {
    title: 'Avg',
    attribute: 'avg',
    suffix: 'ms',
    valueType: 'time',
    titleDescription: 'Average duration of all spans',
  },
  {
    title: 'Min',
    attribute: 'min',
    suffix: 'ms',
    valueType: 'time',
    titleDescription: 'Minimum duration across all spans',
  },
  {
    title: 'Max',
    attribute: 'max',
    suffix: 'ms',
    valueType: 'time',
    titleDescription: 'Maximum duration across all spans',
  },
  {
    title: 'ST Total',
    attribute: 'selfTotal',
    suffix: 'ms',
    valueType: 'time',
    titleDescription: 'Sum of Self Time (time spent in a span when it was not waiting on children)',
  },
  {
    title: 'ST Avg',
    attribute: 'selfAvg',
    suffix: 'ms',
    valueType: 'time',
    titleDescription: 'Average Self Time (time spent in a span when it was not waiting on children)',
  },
  {
    title: 'ST Min',
    attribute: 'selfMin',
    suffix: 'ms',
    valueType: 'time',
    titleDescription: 'Minimum Self Time (time spent in a span when it was not waiting on children)',
  },
  {
    title: 'ST Max',
    attribute: 'selfMax',
    suffix: 'ms',
    valueType: 'time',
    titleDescription: 'Maximum Self Time (time spent in a span when it was not waiting on children)',
  },
  {
    title: 'ST in Duration',
    attribute: 'percent',
    suffix: '%',
    valueType: 'percent',
    titleDescription: 'Percentage of ST Total vs. Total',
  },
];

/**
 * Trace Statistics Component
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
      valueNameSelector1: getServiceName(),
      valueNameSelector2: null,
      colorByAttribute: 'count',
    };

    this.handler = this.handler.bind(this);
    this.togglePopup = this.togglePopup.bind(this);
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
    this.setState(prevState => ({
      tableValue: this.searchInTable(this.props.uiFindVertexKeys, prevState.tableValue, this.props.uiFind),
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
    valueNameSelector2: string | null,
    colorByAttribute: string
  ) {
    this.setState(prevState => {
      return {
        ...prevState,
        tableValue: this.searchInTable(this.props.uiFindVertexKeys, tableValue, this.props.uiFind),
        sortIndex: 1,
        sortAsc: false,
        valueNameSelector1,
        valueNameSelector2,
        wholeTable,
        colorByAttribute,
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
   * Marks entries in the table that match search criteria.
   * @param uiFindVertexKeys Set of found spans
   * @param allTableSpans entries that are shown
   */
  searchInTable = (
    uiFindVertexKeys: Set<string> | TNil,
    allTableSpans: ITableSpan[],
    uiFind: string | null | undefined
  ): ITableSpan[] => {
    const hasDetails = allTableSpans.some(s => s.isDetail);
    const allTableSpansChange = allTableSpans.map(s => ({ ...s, searchMatch: false }));

    const isParentWithSubgroup = (row: ITableSpan) => {
      return hasDetails && !row.isDetail && row.hasSubgroupValue;
    };

    if (uiFindVertexKeys) {
      uiFindVertexKeys.forEach(function calc(value) {
        const uiFindVertexKeysSplit = value.split('\u000b');

        for (let i = 0; i < allTableSpansChange.length; i++) {
          if (
            uiFindVertexKeysSplit[uiFindVertexKeysSplit.length - 1].indexOf(allTableSpansChange[i].name) !==
            -1
          ) {
            if (allTableSpansChange[i].parentElement === 'none') {
              allTableSpansChange[i].searchMatch = true;
            } else if (
              uiFindVertexKeysSplit[uiFindVertexKeysSplit.length - 1].indexOf(
                allTableSpansChange[i].parentElement
              ) !== -1
            ) {
              allTableSpansChange[i].searchMatch = true;
            }
          }
        }
      });
    }
    if (uiFind) {
      for (let i = 0; i < allTableSpansChange.length; i++) {
        if (allTableSpansChange[i].name.indexOf(uiFind!) !== -1) {
          allTableSpansChange[i].searchMatch = true;

          for (let j = 0; j < allTableSpansChange.length; j++) {
            if (allTableSpansChange[j].parentElement === allTableSpansChange[i].name) {
              allTableSpansChange[j].searchMatch = true;
            }
          }
          if (allTableSpansChange[i].isDetail) {
            for (let j = 0; j < allTableSpansChange.length; j++) {
              if (allTableSpansChange[i].parentElement === allTableSpansChange[j].name) {
                if (!isParentWithSubgroup(allTableSpansChange[j])) {
                  allTableSpansChange[j].searchMatch = true;
                }
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
      return {
        className: this.props.uiFind && record.searchMatch ? 'TraceStatistics--searchMatch' : '',
      };
    };

    const activeAttribute = this.state.colorByAttribute;
    let activeMax = 1;
    if (activeAttribute) {
      let max = 0;
      for (const row of this.state.tableValue) {
        const raw = (row as any)[activeAttribute];
        const num = typeof raw === 'number' ? raw : Number(raw);
        if (Number.isFinite(num) && num > max) {
          max = num;
        }
      }
      if (max > 0) {
        activeMax = max;
      }
    }

    const columns: ColumnProps<ITableSpan>[] = columnsArray.map(val => {
      const renderFunction = (cell: string | number, row: ITableSpan) => {
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

        const includeBars = val.attribute === activeAttribute;
        let displayValue: React.ReactNode = cell;

        if (val.valueType === 'time') {
          const microseconds = ((cell as number) * ONE_MILLISECOND) as Microseconds;
          const compactValue = formatDurationCompact(microseconds);
          const preciseValue = `${cell}${val.suffix}`;
          displayValue = <Tooltip title={preciseValue}>{compactValue}</Tooltip>;
        } else if (val.valueType === 'percent') {
          displayValue = `${cell}%`;
        }

        if (includeBars) {
          return (
            <div className="TraceStatistics--valueContainer">
              <RelativeBar value={cell as number} maxValue={val.attribute === 'percent' ? 100 : activeMax} />
              <div className="TraceStatistics--valueDisplay">{displayValue}</div>
            </div>
          );
        }

        return <div className="TraceStatistics--valueDisplay">{displayValue}</div>;
      };

      const ele = {
        title: val.title,
        dataIndex: val.attribute,
        sorter: sorterFunction(val.attribute),
        render: renderFunction,
        onCell: onCellFunction,
        showSorterTooltip: val.attribute !== 'name' ? { title: val.titleDescription } : false,
        align: val.attribute === 'name' ? ('left' as const) : ('right' as const),
      };
      return val.attribute === 'count' ? { ...ele, defaultSortOrder: 'descend' } : ele;
    });
    /**
     * Pre-process the table data into groups and sub-groups
     */
    const detailsMap = new Map<string, ITableSpan[]>();
    this.state.tableValue.forEach(s => {
      if (s.isDetail && s.parentElement) {
        const list = detailsMap.get(s.parentElement);
        if (list) {
          list.push(s);
        } else {
          detailsMap.set(s.parentElement, [s]);
        }
      }
    });

    const groupedAndSubgroupedSpanData: ITableSpan[] = this.state.tableValue
      .filter(s => !s.isDetail)
      .map((parent, i) => ({
        ...parent,
        key: i.toString(),
        children: (detailsMap.get(parent.name) || []).map((child, j) => ({
          ...child,
          key: `${i}-${j}`,
        })),
      }));
    const defaultExpandedRowKeys = groupedAndSubgroupedSpanData
      .filter(row => row.hasSubgroupValue && row.children && row.children.length > 0)
      .map(row => row.key!);

    return (
      <div>
        <h3 className="title--TraceStatistics"> Trace Statistics</h3>

        <TraceStatisticsHeader
          trace={this.props.trace}
          tableValue={this.state.tableValue}
          wholeTable={this.state.wholeTable}
          handler={this.handler}
          useOtelTerms={this.props.useOtelTerms}
        />

        {this.state.showPopup ? (
          <PopupSQL closePopup={this.togglePopup} popupContent={this.state.popupContent} />
        ) : null}
        <Table
          className="span-table span-view-table"
          columns={columns}
          dataSource={groupedAndSubgroupedSpanData}
          rowKey="key"
          key={`${this.props.trace.traceID}-${this.state.valueNameSelector1}-${this.state.valueNameSelector2}-${this.props.uiFind || ''}-${groupedAndSubgroupedSpanData
            .map(r => r.name)
            .sort()
            .join(',')}`}
          pagination={{
            pageSizeOptions: ['10', '20', '50', '100'],
            showSizeChanger: true,
            showQuickJumper: true,
            defaultPageSize: 10,
          }}
          rowClassName={row =>
            !row.hasSubgroupValue ? 'undefClass--TraceStatistics' : 'MainTableData--TraceStatistics'
          }
          defaultExpandedRowKeys={defaultExpandedRowKeys}
          sortDirections={['ascend', 'descend', 'ascend']}
        />
      </div>
    );
  }
}
