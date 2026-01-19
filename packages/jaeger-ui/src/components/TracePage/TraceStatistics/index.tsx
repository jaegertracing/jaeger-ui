// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from 'react';
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

// Interface for imperative handle methods exposed via ref
export interface TraceStatisticsHandle {
  state: State;
  setState: (newState: Partial<State> | ((prev: State) => Partial<State>)) => void;
  handler: (
    newTableValue: ITableSpan[],
    newWholeTable: ITableSpan[],
    newValueNameSelector1: string,
    newValueNameSelector2: string | null
  ) => void;
  togglePopup: (content: string) => void;
  searchInTable: typeof searchInTable;
}

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
const searchInTable = (
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
const TraceStatistics = forwardRef<TraceStatisticsHandle, Props>(function TraceStatistics(props, ref) {
  const { trace, uiFindVertexKeys, uiFind, useOtelTerms } = props;

  const [tableValue, setTableValue] = useState<ITableSpan[]>([]);
  const [sortIndex, setSortIndex] = useState<number>(1);
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [popupContent, setPopupContent] = useState<string>('');
  const [wholeTable, setWholeTable] = useState<ITableSpan[]>([]);
  const [valueNameSelector1, setValueNameSelector1] = useState<string>(getServiceName());
  const [valueNameSelector2, setValueNameSelector2] = useState<string | null>(null);

  // Ref to track current state for imperative handle
  const stateRef = useRef<State>({
    tableValue,
    sortIndex,
    sortAsc,
    showPopup,
    popupContent,
    wholeTable,
    valueNameSelector1,
    valueNameSelector2,
  });

  // Keep stateRef in sync
  stateRef.current = {
    tableValue,
    sortIndex,
    sortAsc,
    showPopup,
    popupContent,
    wholeTable,
    valueNameSelector1,
    valueNameSelector2,
  };

  /**
   * Is called from the child to change the state of the parent.
   * @param newTableValue the values of the column
   * @param newWholeTable the whole table
   * @param newValueNameSelector1 first selector value
   * @param newValueNameSelector2 second selector value
   */
  const handler = useCallback(
    (
      newTableValue: ITableSpan[],
      newWholeTable: ITableSpan[],
      newValueNameSelector1: string,
      newValueNameSelector2: string | null
    ) => {
      // Clone array to avoid mutating caller's data
      // searchInTable modifies array in-place for performance
      const tableValueCopy = newTableValue.map(item => ({ ...item }));
      const searchedTableValue = searchInTable(uiFindVertexKeys ?? undefined, tableValueCopy, uiFind);
      setTableValue(searchedTableValue);
      setSortIndex(1);
      setSortAsc(false);
      setValueNameSelector1(newValueNameSelector1);
      setValueNameSelector2(newValueNameSelector2);
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

  // Refs to access current values in useEffect without triggering re-runs
  const tableValueRef = useRef(tableValue);
  const uiFindRef = useRef(uiFind);
  tableValueRef.current = tableValue;
  uiFindRef.current = uiFind;

  // Track previous uiFindVertexKeys for comparison
  const prevUiFindVertexKeysRef = useRef<Set<string> | TNil | undefined>(undefined);

  // componentDidUpdate equivalent - respond ONLY to uiFindVertexKeys changes
  // This matches the original class component behavior which only checked uiFindVertexKeys
  useEffect(() => {
    // Skip initial mount (prevRef is undefined) - tableValue is empty so search has no effect
    // Only update when uiFindVertexKeys actually changes after initial mount
    if (
      prevUiFindVertexKeysRef.current !== undefined &&
      uiFindVertexKeys !== prevUiFindVertexKeysRef.current
    ) {
      // Clone array to avoid mutating React state directly
      // searchInTable modifies the array in-place for performance
      const tableValueCopy = tableValueRef.current.map(item => ({ ...item }));
      const searchedTableValue = searchInTable(
        uiFindVertexKeys ?? undefined,
        tableValueCopy,
        uiFindRef.current
      );
      setTableValue(searchedTableValue);
    }
    prevUiFindVertexKeysRef.current = uiFindVertexKeys;
  }, [uiFindVertexKeys]);

  // Expose methods and state for tests
  useImperativeHandle(ref, () => {
    const handle = {
      get state(): State {
        return stateRef.current;
      },
      setState: (newState: Partial<State> | ((prev: State) => Partial<State>)) => {
        const updates = typeof newState === 'function' ? newState(stateRef.current) : newState;
        if (updates.tableValue !== undefined) setTableValue(updates.tableValue);
        if (updates.sortIndex !== undefined) setSortIndex(updates.sortIndex);
        if (updates.sortAsc !== undefined) setSortAsc(updates.sortAsc);
        if (updates.showPopup !== undefined) setShowPopup(updates.showPopup);
        if (updates.popupContent !== undefined) setPopupContent(updates.popupContent);
        if (updates.wholeTable !== undefined) setWholeTable(updates.wholeTable);
        if (updates.valueNameSelector1 !== undefined) setValueNameSelector1(updates.valueNameSelector1);
        if (updates.valueNameSelector2 !== undefined) setValueNameSelector2(updates.valueNameSelector2);
      },
      handler,
      togglePopup,
      searchInTable,
    };
    return handle;
  }, [handler, togglePopup]);

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
    [onClickOption, onCellFunction, sorterFunction, handleNameCellKeyDown, handleNameCellClick]
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
   * Memoized to avoid recalculation on every render.
   */
  const groupedAndSubgroupedSpanData = useMemo((): ITableSpan[] => {
    const withDetail: ITableSpan[] = tableValue.filter((val: ITableSpan) => val.isDetail);
    const withoutDetail: ITableSpan[] = tableValue.filter((val: ITableSpan) => !val.isDetail);
    for (let i = 0; i < withoutDetail.length; i++) {
      let newArr = withDetail.filter(value => value.parentElement === withoutDetail[i].name);
      newArr = newArr.map((value, index) => {
        return { ...value, key: `${i}-${index}` };
      });
      const child = {
        key: i.toString(),
        children: newArr,
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
});

TraceStatistics.displayName = 'TraceStatistics';

export default TraceStatistics;
