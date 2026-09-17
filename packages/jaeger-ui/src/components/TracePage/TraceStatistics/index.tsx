// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import './index.css';
import { Table } from 'antd';
import { ColumnProps } from 'antd/es/table';
import { IOtelTrace } from '../../../types/otel';
import TraceStatisticsHeader from './TraceStatisticsHeader';
import { ITableSpan } from './types';
import { TNil } from '../../../types';
import PopupSQL from './PopupSql';
import { getServiceName } from './tableValues';

type Props = {
  trace: IOtelTrace;
  uiFindVertexKeys: Set<string> | TNil;
  uiFind: string | null | undefined;
  useOtelTerms: boolean;
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
 * Colors found entries in the table.
 * @param uiFindVertexKeys Set of found spans
 * @param allTableSpans entries that are shown
 */
export const searchInTable = (
  uiFindVertexKeys: Set<string> | TNil,
  allTableSpans: ITableSpan[],
  uiFind: string | null | undefined
): ITableSpan[] => {
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
      const uiFindVertexKeysSplit = value.split('\u000b');

      for (let i = 0; i < allTableSpansChange.length; i++) {
        if (
          uiFindVertexKeysSplit[uiFindVertexKeysSplit.length - 1].indexOf(allTableSpansChange[i].name) !== -1
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

/**
 * Pre-process the table data into groups and sub-groups
 */
const groupAndSubgroupSpanData = (tableValue: ITableSpan[]): ITableSpan[] => {
  const withDetail: ITableSpan[] = [];
  const withoutDetail: ITableSpan[] = [];
  for (let i = 0; i < tableValue.length; i++) {
    const val = tableValue[i];
    if (val.isDetail) {
      withDetail.push(val);
    } else {
      withoutDetail.push(val);
    }
  }

  const withDetailByParent = new Map<string, ITableSpan[]>();
  for (let i = 0; i < withDetail.length; i++) {
    const val = withDetail[i];
    const { parentElement } = val;
    let list = withDetailByParent.get(parentElement);
    if (!list) {
      list = [];
      withDetailByParent.set(parentElement, list);
    }
    list.push(val);
  }

  for (let i = 0; i < withoutDetail.length; i++) {
    const parentName = withoutDetail[i].name;
    const matchingDetails = withDetailByParent.get(parentName) || [];
    const children = matchingDetails.map((value, index) => {
      const _key = {
        key: `${i}-${index}`,
      };
      return { ...value, ..._key };
    });

    const child = {
      key: i.toString(),
      children,
    };
    withoutDetail[i] = { ...withoutDetail[i], ...child };
  }
  return withoutDetail;
};

const sorterFunction =
  <T extends keyof ITableSpan>(field: T) =>
  (a: ITableSpan, b: ITableSpan) => {
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

/**
 * Trace Statistics Component
 */
export default function TraceStatistics(props: Props) {
  const { trace, uiFindVertexKeys, uiFind, useOtelTerms } = props;

  const [tableValue, setTableValue] = useState<ITableSpan[]>([]);
  const [wholeTable, setWholeTable] = useState<ITableSpan[]>([]);
  const [valueNameSelector1, setValueNameSelector1] = useState<string>(getServiceName);
  const [showPopup, setShowPopup] = useState(false);
  const [popupContent, setPopupContent] = useState('');

  /**
   * If the search props change the search function is re-applied. Mirrors the
   * previous componentDidUpdate, which never ran on the initial mount.
   */
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // searchInTable mutates and returns its input array; spread it into a new
    // array so the identity change is visible to useState's bail-out check.
    setTableValue(current => [...searchInTable(uiFindVertexKeys, current, uiFind)]);
    // eslint-disable-next-line react-x/exhaustive-deps
  }, [uiFindVertexKeys]);

  /**
   * Is called from the child to change the state of the parent.
   */
  const handler = (
    newTableValue: ITableSpan[],
    newWholeTable: ITableSpan[],
    newValueNameSelector1: string,
    // TraceStatisticsHeader's contract always passes the sub-group selection; unused here,
    // same as in the class component this replaces.
    _newValueNameSelector2: string | null
  ) => {
    setTableValue([...searchInTable(uiFindVertexKeys, newTableValue, uiFind)]);
    setWholeTable(newWholeTable);
    setValueNameSelector1(newValueNameSelector1);
  };

  /**
   * Open the popup button.
   */
  const togglePopup = (content: string) => {
    setShowPopup(current => !current);
    setPopupContent(content);
  };

  const onClickOption = (hasSubgroupValue: boolean, name: string) => {
    if (valueNameSelector1 === 'sql.query' && hasSubgroupValue) togglePopup(name);
  };

  const onCellFunction = (record: ITableSpan) => {
    const backgroundColor =
      uiFind && record.searchColor !== 'transparent' ? record.searchColor : record.colorToPercent;
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

  const groupedAndSubgroupedSpanData: ITableSpan[] = groupAndSubgroupSpanData(tableValue);

  return (
    <div>
      <h3 className="title--TraceStatistics"> Trace Statistics</h3>

      <TraceStatisticsHeader
        trace={trace}
        tableValue={tableValue}
        wholeTable={wholeTable}
        handler={handler}
        useOtelTerms={useOtelTerms}
      />

      {showPopup ? <PopupSQL closePopup={togglePopup} popupContent={popupContent} /> : null}
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
