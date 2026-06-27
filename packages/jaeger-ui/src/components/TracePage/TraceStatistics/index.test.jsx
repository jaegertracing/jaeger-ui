// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { act, cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TraceStatistics from './index';
import transformTraceData from '../../../model/transform-trace-data';
import { getColumnValues, getColumnValuesSecondDropdown } from './tableValues';

import testTrace from './tableValuesTestTrace/testTrace.json';

const transformedTrace = transformTraceData(testTrace).asOtelTrace();

describe('<TraceTagOverview>', () => {
  const defaultProps = {
    trace: transformedTrace,
    uiFind: undefined,
    uiFindVertexKeys: undefined,
    useOtelTerms: false,
  };

  afterEach(cleanup);

  it('does not explode, renders trace statistics, and handles search, interactive options, sorting, and searchInTable', async () => {
    // 1. Initial render
    let componentInstance;
    const TestWrapper = () => {
      return (
        <TraceStatistics
          ref={ref => {
            componentInstance = ref;
          }}
          {...defaultProps}
        />
      );
    };

    const { rerender, container } = render(<TestWrapper />);

    // Assert it does not explode and renders trace statistics
    expect(screen.getByText('Trace Statistics')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByText(/Tag: "SQL"/)).not.toBeInTheDocument();

    // 2. Check search
    await waitFor(() => {
      expect(componentInstance).toBeTruthy();
      expect(componentInstance.state.tableValue).toBeDefined();
    });

    const searchSet = new Set();
    searchSet.add('service1	op1	__LEAF__');

    await act(async () => {
      rerender(
        <TraceStatistics
          ref={ref => {
            componentInstance = ref;
          }}
          {...defaultProps}
          uiFind="service1"
          uiFindVertexKeys={searchSet}
        />
      );
    });

    await waitFor(() => {
      expect(componentInstance.state.tableValue.length).toBeGreaterThan(0);
      const hasHighlightedItems = componentInstance.state.tableValue.some(
        item => item.searchColor === 'rgb(255,243,215)'
      );
      expect(hasHighlightedItems).toBe(true);
    });

    await act(async () => {
      rerender(
        <TraceStatistics
          ref={ref => {
            componentInstance = ref;
          }}
          {...defaultProps}
          uiFind={undefined}
          uiFindVertexKeys={undefined}
        />
      );
    });

    await waitFor(() => {
      const tableCells = screen.getAllByRole('cell');
      expect(tableCells.length).toBeGreaterThan(0);
    });

    // 3. Check handler
    let tableValue = getColumnValues('Service Name', transformedTrace, false);
    tableValue = getColumnValuesSecondDropdown(
      tableValue,
      'Service Name',
      'Operation Name',
      transformedTrace,
      false
    );

    await act(async () => {
      componentInstance.handler(tableValue, tableValue, 'Service Name', 'Operation Name');
    });

    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(1);
    const cells = screen.getAllByRole('cell');
    expect(cells.length).toBeGreaterThan(0);

    // 4. Groups detail rows under their matching parent rows
    const makeRow = (name, isDetail, parentElement, overrides = {}) => ({
      name,
      hasSubgroupValue: !isDetail,
      searchColor: 'transparent',
      color: '#000',
      key: name,
      isDetail,
      parentElement,
      count: 1,
      total: 100,
      avg: 50,
      min: 10,
      max: 90,
      selfTotal: 80,
      selfAvg: 40,
      selfMin: 5,
      selfMax: 75,
      percent: 80,
      colorToPercent: '#fff',
      traceID: name,
      ...overrides,
    });

    await act(async () => {
      componentInstance.setState({
        tableValue: [
          makeRow('parent-a', false, 'none'),
          makeRow('detail-a1', true, 'parent-a', { hasSubgroupValue: false }),
          makeRow('detail-a2', true, 'parent-a', { hasSubgroupValue: false }),
          makeRow('parent-b', false, 'none'),
          makeRow('detail-b1', true, 'parent-b', { hasSubgroupValue: false }),
        ],
      });
    });

    await waitFor(() => {
      expect(screen.getByText('parent-a')).toBeInTheDocument();
      expect(screen.getByText('parent-b')).toBeInTheDocument();
      expect(screen.getByText('detail-a1')).toBeInTheDocument();
      expect(screen.getByText('detail-a2')).toBeInTheDocument();
      expect(screen.getByText('detail-b1')).toBeInTheDocument();
    });

    const parentRows = container.querySelectorAll('tbody tr.ant-table-row-level-0');
    const childRows = container.querySelectorAll('tbody tr.ant-table-row-level-1');
    expect(parentRows).toHaveLength(2);
    expect(childRows).toHaveLength(3);

    // 5. Check togglePopup
    await act(async () => {
      componentInstance.togglePopup('select *');
    });

    await waitFor(() => {
      const textarea = screen.getByRole('textbox');
      expect(textarea.value).toBe('"select *"');
    });

    await act(async () => {
      componentInstance.togglePopup('select *');
    });

    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    // 6. Should trigger onClickOption when clicking on name cell with sql.query selector
    await act(async () => {
      componentInstance.setState({
        valueNameSelector1: 'sql.query',
        tableValue: [
          {
            name: 'SELECT * FROM users',
            hasSubgroupValue: true,
            searchColor: 'transparent',
            color: '#000',
            key: '0',
            isDetail: false,
            parentElement: 'none',
            count: 1,
            total: 100,
            avg: 50,
            min: 10,
            max: 90,
            selfTotal: 80,
            selfAvg: 40,
            selfMin: 5,
            selfMax: 75,
            percent: 80,
            colorToPercent: '#fff',
          },
        ],
      });
    });

    let nameButtonForQuery;
    await waitFor(() => {
      const nameButtons = screen.getAllByRole('button');
      nameButtonForQuery = nameButtons.find(
        button => button.textContent.includes('SELECT') || button.style.borderLeft || button.style.padding
      );
      expect(nameButtonForQuery).toBeDefined();
    });

    fireEvent.click(nameButtonForQuery);

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    // Clean up popup
    await act(async () => {
      componentInstance.setState({
        showPopup: false,
      });
    });

    // 7. Should handle onClickOption when hasSubgroupValue is false
    await act(async () => {
      componentInstance.setState({
        valueNameSelector1: 'sql.query',
        tableValue: [
          {
            name: 'test-name',
            hasSubgroupValue: false,
            searchColor: 'transparent',
            color: '#000',
            key: '0',
            isDetail: false,
            parentElement: 'none',
            count: 1,
            total: 100,
            avg: 50,
            min: 10,
            max: 90,
            selfTotal: 80,
            selfAvg: 40,
            selfMin: 5,
            selfMax: 75,
            percent: 80,
            colorToPercent: '#fff',
          },
        ],
      });
    });

    let nameButtonForSubgroup;
    await waitFor(() => {
      const nameButtons = screen.getAllByRole('button');
      nameButtonForSubgroup = nameButtons.find(
        button => button.textContent.includes('test-name') || button.style.borderLeft || button.style.padding
      );
      expect(nameButtonForSubgroup).toBeDefined();
    });

    fireEvent.click(nameButtonForSubgroup);

    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    // 8. Should test sorter function with string comparison
    const columnHeaders = screen.getAllByRole('columnheader');
    const groupColumn = columnHeaders.find(header => header.textContent.includes('Group'));

    if (groupColumn) {
      fireEvent.click(groupColumn);
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    }

    // 9. Should test sorter function with items that have no hasSubgroupValue
    await act(async () => {
      componentInstance.setState({
        tableValue: [
          {
            name: 'item1',
            hasSubgroupValue: false,
            count: 1,
            total: 100,
            key: '0',
            searchColor: 'transparent',
            colorToPercent: '#fff',
          },
          {
            name: 'item2',
            hasSubgroupValue: true,
            count: 2,
            total: 200,
            key: '1',
            searchColor: 'transparent',
            colorToPercent: '#fff',
          },
          {
            name: 'item3',
            hasSubgroupValue: false,
            count: 3,
            total: 300,
            key: '2',
            searchColor: 'transparent',
            colorToPercent: '#fff',
          },
        ],
      });
    });

    const countColumn = screen
      .getAllByRole('columnheader')
      .find(header => header.textContent.includes('Count'));
    if (countColumn) {
      fireEvent.click(countColumn);
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    }

    // 10. Test searchInTable
    const mockTableData = [
      {
        name: 'parent1',
        isDetail: false,
        hasSubgroupValue: true,
        parentElement: 'none',
        searchColor: 'rgb(248,248,248)',
        key: '0',
      },
      {
        name: 'detail1',
        isDetail: true,
        hasSubgroupValue: false,
        parentElement: 'parent1',
        searchColor: 'rgb(248,248,248)',
        key: '1',
      },
      {
        name: 'detail2',
        isDetail: true,
        hasSubgroupValue: false,
        parentElement: 'parent2',
        searchColor: 'rgb(248,248,248)',
        key: '2',
      },
    ];

    const searchSet2 = new Set(['parent1detail1']);
    const result1 = componentInstance.searchInTable(searchSet2, mockTableData, null);
    expect(result1).toBeDefined();
    expect(result1.length).toBe(3);

    const mockTableData2 = [
      {
        name: 'searchterm',
        isDetail: true,
        hasSubgroupValue: false,
        parentElement: 'parentitem',
        searchColor: 'rgb(248,248,248)',
        key: '0',
      },
      {
        name: 'parentitem',
        isDetail: false,
        hasSubgroupValue: true,
        parentElement: 'none',
        searchColor: 'rgb(248,248,248)',
        key: '1',
      },
      {
        name: 'childitem',
        isDetail: true,
        hasSubgroupValue: false,
        parentElement: 'searchterm',
        searchColor: 'rgb(248,248,248)',
        key: '2',
      },
    ];

    const result2 = componentInstance.searchInTable(undefined, mockTableData2, 'searchterm');
    const highlightedItems = result2.filter(item => item.searchColor === 'rgb(255,243,215)');
    expect(highlightedItems.length).toBeGreaterThan(0);

    const mockTableData3 = [
      {
        name: 'item1',
        isDetail: true,
        hasSubgroupValue: true,
        parentElement: 'none',
        searchColor: undefined,
        key: '0',
      },
      {
        name: 'item2',
        isDetail: false,
        hasSubgroupValue: false,
        parentElement: 'none',
        searchColor: undefined,
        key: '1',
      },
    ];

    const result3 = componentInstance.searchInTable(undefined, mockTableData3, null);
    expect(result3[0].searchColor).toBe('rgb(248,248,248)');
    expect(result3[1].searchColor).toBe('rgb(248,248,248)');
  }, 30000);
});
