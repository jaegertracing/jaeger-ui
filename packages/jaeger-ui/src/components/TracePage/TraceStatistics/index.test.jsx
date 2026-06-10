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

// Stub the Header so tests drive the parent's real `handler` prop without
// having to script antd Select interactions. Using vi.hoisted because
// vi.mock is hoisted above any `const`/`let` declarations.
const headerHandlerRef = vi.hoisted(() => ({ current: null }));
vi.mock('./TraceStatisticsHeader', () => ({
  default: function MockTraceStatisticsHeader(props) {
    headerHandlerRef.current = props.handler;
    return null;
  },
}));

// Row factory keeps individual tests from re-listing the full ITableSpan shape.
function makeRow(name, isDetail, parentElement, overrides = {}) {
  return {
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
  };
}

describe('<TraceTagOverview>', () => {
  const defaultProps = {
    trace: transformedTrace,
    uiFind: undefined,
    uiFindVertexKeys: undefined,
    useOtelTerms: false,
  };

  afterEach(cleanup);

  it('does not explode', () => {
    const { container } = render(<TraceStatistics {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('renders Trace Tag Overview', () => {
    render(<TraceStatistics {...defaultProps} />);

    expect(screen.getByText('Trace Statistics')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByText(/Tag: "SQL"/)).not.toBeInTheDocument();
  });

  it('check search', async () => {
    const { rerender } = render(<TraceStatistics {...defaultProps} />);

    // Mocked Header captured the handler; use it to inject a row whose name
    // also appears in the search-set vertex key below.
    const rows = () => [makeRow('service1', false, 'none')];
    await act(async () => {
      headerHandlerRef.current(rows(), rows(), 'service.name', null);
    });
    expect(await screen.findByText('service1')).toBeInTheDocument();

    // Re-render with search props and re-inject so the handler closure picks
    // up the new uiFind/uiFindVertexKeys when it calls searchInTable.
    const matching = new Set(['service1\top1\t__LEAF__']);
    rerender(<TraceStatistics {...defaultProps} uiFind="service1" uiFindVertexKeys={matching} />);
    await act(async () => {
      headerHandlerRef.current(rows(), rows(), 'service.name', null);
    });

    await waitFor(() => {
      const cells = screen.getAllByRole('cell');
      const highlighted = cells.some(c => c.style.backgroundColor.replace(/\s/g, '') === 'rgb(255,243,215)');
      expect(highlighted).toBe(true);
    });

    // Clearing the search props leaves the table rendered (no crash).
    rerender(<TraceStatistics {...defaultProps} uiFind={undefined} uiFindVertexKeys={undefined} />);
    expect(screen.getAllByRole('cell').length).toBeGreaterThan(0);
  });

  it('re-colors existing rows when uiFindVertexKeys transitions from undefined to a Set', async () => {
    // Mount with no search props at all.
    const { rerender } = render(<TraceStatistics {...defaultProps} />);

    // Populate the table while uiFindVertexKeys is still undefined.
    const rows = () => [makeRow('service1', false, 'none')];
    await act(async () => {
      headerHandlerRef.current(rows(), rows(), 'service.name', null);
    });
    expect(await screen.findByText('service1')).toBeInTheDocument();

    // Now flip uiFindVertexKeys to a real Set without re-invoking the handler.
    // The useEffect must still re-run searchInTable so the row picks up the
    // highlight colour. The previous prev !== undefined guard skipped this
    // first transition, leaving the row stale.
    const matching = new Set(['service1\top1\t__LEAF__']);
    rerender(<TraceStatistics {...defaultProps} uiFind="service1" uiFindVertexKeys={matching} />);

    await waitFor(() => {
      const cells = screen.getAllByRole('cell');
      const highlighted = cells.some(c => c.style.backgroundColor.replace(/\s/g, '') === 'rgb(255,243,215)');
      expect(highlighted).toBe(true);
    });
  });

  it('check handler', async () => {
    render(<TraceStatistics {...defaultProps} />);

    let tableValue = getColumnValues('Service Name', transformedTrace, false);
    tableValue = getColumnValuesSecondDropdown(
      tableValue,
      'Service Name',
      'Operation Name',
      transformedTrace,
      false
    );

    await act(async () => {
      headerHandlerRef.current(tableValue, tableValue, 'Service Name', 'Operation Name');
    });

    expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
    expect(screen.getAllByRole('cell').length).toBeGreaterThan(0);
  });

  it('groups detail rows under their matching parent rows', async () => {
    const { container } = render(<TraceStatistics {...defaultProps} />);

    const rows = [
      makeRow('parent-a', false, 'none'),
      makeRow('detail-a1', true, 'parent-a'),
      makeRow('detail-a2', true, 'parent-a'),
      makeRow('parent-b', false, 'none'),
      makeRow('detail-b1', true, 'parent-b'),
    ];

    await act(async () => {
      headerHandlerRef.current(rows, rows, 'service.name', null);
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

  it('check togglePopup', async () => {
    render(<TraceStatistics {...defaultProps} />);

    // Inject a single sql.query group row so clicking it opens the popup.
    await act(async () => {
      headerHandlerRef.current(
        [makeRow('select *', false, 'none')],
        [makeRow('select *', false, 'none')],
        'sql.query',
        null
      );
    });

    const cell = await screen.findByRole('button', { name: 'select *' });
    fireEvent.click(cell);

    const textarea = await screen.findByRole('textbox');
    expect(textarea.value).toBe('"select *"');

    // Same content + second click flips showPopup back to false.
    fireEvent.click(cell);
    await waitFor(() => {
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  it('should trigger onClickOption when clicking on name cell with sql.query selector', async () => {
    render(<TraceStatistics {...defaultProps} />);

    await act(async () => {
      headerHandlerRef.current(
        [makeRow('SELECT * FROM users', false, 'none')],
        [makeRow('SELECT * FROM users', false, 'none')],
        'sql.query',
        null
      );
    });

    const cell = await screen.findByRole('button', { name: 'SELECT * FROM users' });
    fireEvent.click(cell);

    expect(await screen.findByRole('textbox')).toBeInTheDocument();
  });

  it.each([
    ['Enter', { key: 'Enter', code: 'Enter' }],
    ['Space', { key: ' ', code: 'Space' }],
  ])('opens the popup when pressing %s on a sql.query name cell', async (_, keyEvent) => {
    render(<TraceStatistics {...defaultProps} />);

    await act(async () => {
      headerHandlerRef.current(
        [makeRow('SELECT * FROM users', false, 'none')],
        [makeRow('SELECT * FROM users', false, 'none')],
        'sql.query',
        null
      );
    });

    const cell = await screen.findByRole('button', { name: 'SELECT * FROM users' });
    fireEvent.keyDown(cell, keyEvent);

    expect(await screen.findByRole('textbox')).toBeInTheDocument();
  });

  it('should not open the popup when pressing a non-Enter/Space key', async () => {
    render(<TraceStatistics {...defaultProps} />);

    await act(async () => {
      headerHandlerRef.current(
        [makeRow('SELECT * FROM users', false, 'none')],
        [makeRow('SELECT * FROM users', false, 'none')],
        'sql.query',
        null
      );
    });

    const cell = await screen.findByRole('button', { name: 'SELECT * FROM users' });
    fireEvent.keyDown(cell, { key: 'Tab', code: 'Tab' });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('should handle onClickOption when hasSubgroupValue is false', async () => {
    render(<TraceStatistics {...defaultProps} />);

    // hasSubgroupValue=false means the click should be a no-op even under sql.query.
    await act(async () => {
      headerHandlerRef.current(
        [makeRow('test-name', false, 'none', { hasSubgroupValue: false })],
        [makeRow('test-name', false, 'none', { hasSubgroupValue: false })],
        'sql.query',
        null
      );
    });

    const cell = await screen.findByRole('button', { name: 'test-name' });
    fireEvent.click(cell);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('should test sorter function with string comparison', async () => {
    render(<TraceStatistics {...defaultProps} />);

    const columnHeaders = screen.getAllByRole('columnheader');
    const groupColumn = columnHeaders.find(header => header.textContent.includes('Group'));

    if (groupColumn) {
      fireEvent.click(groupColumn);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    }
  });

  it('should test sorter function with items that have no hasSubgroupValue', async () => {
    render(<TraceStatistics {...defaultProps} />);

    await act(async () => {
      headerHandlerRef.current(
        [
          makeRow('item1', false, 'none', { hasSubgroupValue: false, count: 1, total: 100 }),
          makeRow('item2', false, 'none', { hasSubgroupValue: true, count: 2, total: 200 }),
          makeRow('item3', false, 'none', { hasSubgroupValue: false, count: 3, total: 300 }),
        ],
        [],
        'service.name',
        null
      );
    });

    const countColumn = screen
      .getAllByRole('columnheader')
      .find(header => header.textContent.includes('Count'));
    expect(countColumn).toBeDefined();
    fireEvent.click(countColumn);

    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('should test searchInTable with complex search scenarios', () => {
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

    const result = searchInTable(new Set(['parent1detail1']), mockTableData, null);
    expect(result).toBeDefined();
    expect(result.length).toBe(3);
  });

  it('should test searchInTable with uiFind matching and detail items', () => {
    const mockTableData = [
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

    const result = searchInTable(undefined, mockTableData, 'searchterm');
    const highlightedItems = result.filter(item => item.searchColor === 'rgb(255,243,215)');
    expect(highlightedItems.length).toBeGreaterThan(0);
  });

  it('should test searchInTable with items that have subgroup values but are details', () => {
    const mockTableData = [
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

    const result = searchInTable(undefined, mockTableData, null);
    expect(result[0].searchColor).toBe('rgb(248,248,248)');
    expect(result[1].searchColor).toBe('rgb(248,248,248)');
  });
});
