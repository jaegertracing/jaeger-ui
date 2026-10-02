// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

// Search highlight colors - defined at module level to avoid recreation on each call
const YELLOW_SEARCH_COLOR = 'rgb(255,243,215)';
const DEFAULT_GRAY_COLOR = 'rgb(248,248,248)';

/**
 * Colors found entries in the table.
 * NOTE: This function mutates the input array in-place for performance.
 * Callers should clone the array before passing if immutability is required.
 *
 * @param uiFindVertexKeys Set of found spans
 * @param allTableSpans entries that are shown (will be mutated)
 * @param uiFind search string
 */
export const searchInTable = (
  uiFindVertexKeys: Set<string> | undefined,
  allTableSpans: ITableSpan[],
  uiFind: string | null | undefined
): ITableSpan[] => {
  // Reset all search colors to default
  for (let i = 0; i < allTableSpans.length; i++) {
    if (!allTableSpans[i].isDetail && allTableSpans[i].hasSubgroupValue) {
      allTableSpans[i].searchColor = 'transparent';
    } else if (allTableSpans[i].hasSubgroupValue) {
      allTableSpans[i].searchColor = DEFAULT_GRAY_COLOR;
    } else {
      allTableSpans[i].searchColor = DEFAULT_GRAY_COLOR;
    }
  }

  // Highlight rows matching uiFindVertexKeys
  if (uiFindVertexKeys) {
    uiFindVertexKeys.forEach(function highlightMatchingRows(value) {
      const uiFindVertexKeysSplit = value.split('\u000b');

      for (let i = 0; i < allTableSpans.length; i++) {
        if (uiFindVertexKeysSplit[uiFindVertexKeysSplit.length - 1].indexOf(allTableSpans[i].name) !== -1) {
          if (allTableSpans[i].parentElement === 'none') {
            allTableSpans[i].searchColor = YELLOW_SEARCH_COLOR;
          } else if (
            uiFindVertexKeysSplit[uiFindVertexKeysSplit.length - 1].indexOf(
              allTableSpans[i].parentElement
            ) !== -1
          ) {
            allTableSpans[i].searchColor = YELLOW_SEARCH_COLOR;
          }
        }
      }
    });
  }

  // Highlight rows matching uiFind text
  if (uiFind) {
    for (let i = 0; i < allTableSpans.length; i++) {
      if (allTableSpans[i].name.indexOf(uiFind) !== -1) {
        allTableSpans[i].searchColor = YELLOW_SEARCH_COLOR;

        for (let j = 0; j < allTableSpans.length; j++) {
          if (allTableSpans[j].parentElement === allTableSpans[i].name) {
            allTableSpans[j].searchColor = YELLOW_SEARCH_COLOR;
          }
        }
        if (allTableSpans[i].isDetail) {
          for (let j = 0; j < allTableSpans.length; j++) {
            if (allTableSpans[i].parentElement === allTableSpans[j].name) {
              allTableSpans[j].searchColor = YELLOW_SEARCH_COLOR;
            }
          }
        }
      }
    }
  }
  return allTableSpans;
};

/**
 * Trace Statistics Component
 */
export default function TraceStatistics(props: Props) {
  const { trace, uiFindVertexKeys, uiFind, useOtelTerms } = props;

  const [tableValue, setTableValue] = useState<ITableSpan[]>([]);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [popupContent, setPopupContent] = useState<string>('');
  const [wholeTable, setWholeTable] = useState<ITableSpan[]>([]);
  const [valueNameSelector1, setValueNameSelector1] = useState<string>(() => getServiceName());

  /**
   * Replaces the parent table state from the Header child.
   */
  const handler = useCallback(
    (newTableValue: ITableSpan[], newWholeTable: ITableSpan[], newValueNameSelector1: string) => {
      // Clone before searchInTable, which mutates rows in place for speed.
      const tableValueCopy = newTableValue.map(item => ({ ...item }));
      setTableValue(searchInTable(uiFindVertexKeys ?? undefined, tableValueCopy, uiFind));
      setValueNameSelector1(newValueNameSelector1);
      setWholeTable(newWholeTable);
    },
    [uiFindVertexKeys, uiFind]
  );

  /**
   * Open/close the popup button.
   * @param content popup content
   */
  const togglePopup = useCallback((content: string) => {
    setShowPopup(prev => !prev);
    setPopupContent(content);
  }, []);

  // Refs let the search effect read the latest tableValue/uiFind without
  // forcing it to re-run on every change of either.
  const tableValueRef = useRef(tableValue);
  const uiFindRef = useRef(uiFind);
  tableValueRef.current = tableValue;
  uiFindRef.current = uiFind;

  // Mirror the class component's componentDidUpdate, which only re-applied
  // the search when uiFindVertexKeys changed. The empty-tableValue check
  // makes the initial mount a no-op without needing to track a previous value.
  useEffect(() => {
    if (tableValueRef.current.length === 0) return;
    const tableValueCopy = tableValueRef.current.map(item => ({ ...item }));
    setTableValue(searchInTable(uiFindVertexKeys ?? undefined, tableValueCopy, uiFindRef.current));
  }, [uiFindVertexKeys]);

  const onClickOption = useCallback(
    (hasSubgroupValue: boolean, name: string) => {
      if (valueNameSelector1 === 'sql.query' && hasSubgroupValue) togglePopup(name);
    },
    [valueNameSelector1, togglePopup]
  );

  const sorterFunction = useCallback(<T extends keyof ITableSpan>(field: T) => {
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
  }, []);

  const onCellFunction = useCallback(
    (record: ITableSpan) => {
      const backgroundColor =
        uiFind && record.searchColor !== 'transparent' ? record.searchColor : record.colorToPercent;
      return {
        style: { background: backgroundColor, borderColor: backgroundColor },
      };
    },
    [uiFind]
  );

  // Single memoized handler using data attributes to avoid creating function per cell
  const handleNameCellKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLSpanElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const target = e.currentTarget;
        const hasSubgroupValue = target.dataset.hasSubgroupValue === 'true';
        const name = target.dataset.name || '';
        onClickOption(hasSubgroupValue, name);
      }
    },
    [onClickOption]
  );

  // Single memoized click handler using data attributes
  const handleNameCellClick = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>) => {
      const target = e.currentTarget;
      const hasSubgroupValue = target.dataset.hasSubgroupValue === 'true';
      const name = target.dataset.name || '';
      onClickOption(hasSubgroupValue, name);
    },
    [onClickOption]
  );

  const columns: ColumnProps<ITableSpan>[] = useMemo(
    () =>
      columnsArray.map(val => {
        const renderFunction = (cell: string, row: ITableSpan) => {
          if (val.attribute === 'name') {
            return (
              <span
                role="button"
                tabIndex={0}
                data-has-subgroup-value={row.hasSubgroupValue}
                data-name={row.name}
                onClick={handleNameCellClick}
                onKeyDown={handleNameCellKeyDown}
                style={{
                  borderLeft: `4px solid ${row.color || 'transparent'}`,
                  padding: '7px 0px 7px 10px',
                  cursor: 'default',
                }}
              >
                {cell}
              </span>
            );
          }
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
      }),
    [onCellFunction, sorterFunction, handleNameCellKeyDown, handleNameCellClick]
  );

  /**
   * Determines row CSS class based on hasSubgroupValue
   * Memoized to maintain referential equality
   */
  const getRowClassName = useCallback(
    (row: ITableSpan) =>
      !row.hasSubgroupValue ? 'undefClass--TraceStatistics' : 'MainTableData--TraceStatistics',
    []
  );

  /**
   * Pre-process the table data into groups and sub-groups.
   * Memoized to avoid recalculation on every render. Detail rows are
   * pre-grouped into a Map keyed by parent name so the per-parent lookup
   * stays O(1) instead of re-scanning the full list (see PR #3718).
   */
  const groupedAndSubgroupedSpanData = useMemo((): ITableSpan[] => {
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
      const children = matchingDetails.map((value, index) => ({
        ...value,
        key: `${i}-${index}`,
      }));
      const child = {
        key: i.toString(),
        children,
      };
      withoutDetail[i] = { ...withoutDetail[i], ...child };
    }
    return withoutDetail;
  }, [tableValue]);

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
        rowClassName={getRowClassName}
        key={groupedAndSubgroupedSpanData.length}
        defaultExpandAllRows
        sortDirections={['ascend', 'descend', 'ascend']}
      />
    </div>
  );
}
