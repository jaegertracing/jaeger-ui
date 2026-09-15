// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { act, cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TraceStatistics, { searchInTable } from './index';
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

  it('renders trace statistics without exploding', () => {
    render(<TraceStatistics {...defaultProps} />);
    expect(screen.getByText('Trace Statistics')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByText(/Tag: "SQL"/)).not.toBeInTheDocument();
  });

  it('handles search highlights when uiFind and uiFindVertexKeys are provided', async () => {
    let componentInstance;
    const TestWrapper = () => (
      <TraceStatistics
        ref={ref => {
          componentInstance = ref;
        }}
        {...defaultProps}
      />
    );

    const { rerender } = render(<TestWrapper />);

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
  });

  it('updates state via handler', async () => {
    let componentInstance;
    const TestWrapper = () => (
      <TraceStatistics
        ref={ref => {
          componentInstance = ref;
        }}
        {...defaultProps}
      />
    );

    render(<TestWrapper />);

    await waitFor(() => {
      expect(componentInstance).toBeTruthy();
    });

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
  });

  it('groups detail rows under their matching parent rows', async () => {
    let componentInstance;
    const TestWrapper = () => (
      <TraceStatistics
        ref={ref => {
          componentInstance = ref;
        }}
        {...defaultProps}
      />
    );

    const { container } = render(<TestWrapper />);

    await waitFor(() => {
      expect(componentInstance).toBeTruthy();
    });

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
  });

  it('toggles SQL popup', async () => {
    let componentInstance;
    const TestWrapper = () => (
      <TraceStatistics
        ref={ref => {
          componentInstance = ref;
        }}
        {...defaultProps}
      />
    );

    render(<TestWrapper />);

    await waitFor(() => {
      expect(componentInstance).toBeTruthy();
    });

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
  });

  it('triggers onClickOption when clicking name cell with sql.query selector', async () => {
    let componentInstance;
    const TestWrapper = () => (
      <TraceStatistics
        ref={ref => {
          componentInstance = ref;
        }}
        {...defaultProps}
      />
    );

    render(<TestWrapper />);

    await waitFor(() => {
      expect(componentInstance).toBeTruthy();
    });

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
  });

  it('does not trigger popup when hasSubgroupValue is false', async () => {
    let componentInstance;
    const TestWrapper = () => (
      <TraceStatistics
        ref={ref => {
          componentInstance = ref;
        }}
        {...defaultProps}
      />
    );

    render(<TestWrapper />);

    await waitFor(() => {
      expect(componentInstance).toBeTruthy();
    });

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
  });

  it('supports sorting by Group column', async () => {
    render(<TraceStatistics {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    const columnHeaders = screen.getAllByRole('columnheader');
    const groupColumn = columnHeaders.find(header => header.textContent.includes('Group'));

    if (groupColumn) {
      fireEvent.click(groupColumn);
      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    }
  });

  it('supports sorting columns when items lack subgroup values', async () => {
    let componentInstance;
    const TestWrapper = () => (
      <TraceStatistics
        ref={ref => {
          componentInstance = ref;
        }}
        {...defaultProps}
      />
    );

    render(<TestWrapper />);

    await waitFor(() => {
      expect(componentInstance).toBeTruthy();
    });

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
  });
});

describe('searchInTable()', () => {
  it('handles search scenario with complex hierarchy', () => {
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
    const result = searchInTable(searchSet2, mockTableData, null);
    expect(result).toBeDefined();
    expect(result.length).toBe(3);
  });

  it('handles search term matching detail items', () => {
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

    const result = searchInTable(undefined, mockTableData2, 'searchterm');
    const highlightedItems = result.filter(item => item.searchColor === 'rgb(255,243,215)');
    expect(highlightedItems.length).toBeGreaterThan(0);
  });

  it('sets default colors when no match is found', () => {
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

    const result = searchInTable(undefined, mockTableData3, null);
    expect(result[0].searchColor).toBe('rgb(248,248,248)');
    expect(result[1].searchColor).toBe('rgb(248,248,248)');
  });
});
