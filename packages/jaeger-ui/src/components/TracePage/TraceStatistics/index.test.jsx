// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

vi.mock('./tableValues', () => ({
  getServiceName: vi.fn(() => 'Service Name'),
  getOperationName: vi.fn(useOtelTerms => (useOtelTerms ? 'Span Name' : 'Operation Name')),
  getColumnValues: vi.fn(() => []),
  getColumnValuesSecondDropdown: vi.fn(() => []),
}));

vi.mock('./generateDropdownValue', () => ({
  generateDropdownValue: vi.fn(() => ['Service Name', 'Operation Name', 'sql.query']),
  generateSecondDropdownValue: vi.fn(() => []),
}));

import TraceStatistics, { searchInTable } from './index';
import { getColumnValues } from './tableValues';

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

describe('<TraceStatistics>', () => {
  const defaultProps = {
    trace: { traceID: 't', spans: [] },
    uiFind: undefined,
    uiFindVertexKeys: undefined,
    useOtelTerms: false,
  };

  beforeEach(() => {
    // fresh objects per call so tableValue/wholeTable never alias each other
    getColumnValues.mockImplementation(() => []);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('does not explode', () => {
    const { container } = render(<TraceStatistics {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('renders Trace Statistics', () => {
    render(<TraceStatistics {...defaultProps} />);

    expect(screen.getByText('Trace Statistics')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.queryByText(/Tag: "SQL"/)).not.toBeInTheDocument();
  });

  it('highlights rows matching uiFind / uiFindVertexKeys', async () => {
    getColumnValues.mockImplementation(() => [makeRow('service1', false, 'none')]);
    const searchSet = new Set(['service1\top1\t__LEAF__']);

    const { rerender } = render(<TraceStatistics {...defaultProps} />);
    await screen.findByText('service1');

    rerender(<TraceStatistics {...defaultProps} uiFind="service1" uiFindVertexKeys={searchSet} />);

    await waitFor(() => {
      const cell = screen.getByText('service1').closest('td');
      expect(cell).toHaveStyle({ background: 'rgb(255,243,215)' });
    });

    rerender(<TraceStatistics {...defaultProps} uiFind={undefined} uiFindVertexKeys={undefined} />);

    await waitFor(() => {
      const cell = screen.getByText('service1').closest('td');
      expect(cell).not.toHaveStyle({ background: 'rgb(255,243,215)' });
    });
  });

  it('groups detail rows under their matching parent rows', async () => {
    getColumnValues.mockImplementation(() => [
      makeRow('parent-a', false, 'none'),
      makeRow('detail-a1', true, 'parent-a', { hasSubgroupValue: false }),
      makeRow('detail-a2', true, 'parent-a', { hasSubgroupValue: false }),
      makeRow('parent-b', false, 'none'),
      makeRow('detail-b1', true, 'parent-b', { hasSubgroupValue: false }),
    ]);

    const { container } = render(<TraceStatistics {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('parent-a')).toBeInTheDocument();
      expect(screen.getByText('parent-b')).toBeInTheDocument();
      expect(screen.getByText('detail-a1')).toBeInTheDocument();
      expect(screen.getByText('detail-a2')).toBeInTheDocument();
      expect(screen.getByText('detail-b1')).toBeInTheDocument();
    });

    await waitFor(() => {
      const parentRows = container.querySelectorAll('tbody tr.ant-table-row-level-0');
      const childRows = container.querySelectorAll('tbody tr.ant-table-row-level-1');
      expect(parentRows).toHaveLength(2);
      expect(childRows).toHaveLength(3);
    });
  });

  it('toggles the SQL popup when a subgroup name cell is clicked while grouped by sql.query', async () => {
    getColumnValues.mockImplementation(() => [
      makeRow('select *', false, 'none', { hasSubgroupValue: true }),
    ]);

    render(<TraceStatistics {...defaultProps} />);

    const groupBy = screen.getAllByRole('combobox')[0];
    await userEvent.click(groupBy);
    fireEvent.click(await screen.findByText('sql.query'));

    const nameCell = await screen.findByText('select *');
    fireEvent.click(nameCell);

    const textarea = await screen.findByRole('textbox');
    expect(textarea.value).toBe('"select *"');

    fireEvent.click(screen.getByText('select *'));
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
  });

  it('does not open the popup for a row without a subgroup value', async () => {
    getColumnValues.mockImplementation(() => [makeRow('leaf', false, 'none', { hasSubgroupValue: false })]);

    render(<TraceStatistics {...defaultProps} />);

    const groupBy = screen.getAllByRole('combobox')[0];
    await userEvent.click(groupBy);
    fireEvent.click(await screen.findByText('sql.query'));

    const nameCell = await screen.findByText('leaf');
    fireEvent.click(nameCell);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('sorts by group name without exploding', async () => {
    getColumnValues.mockImplementation(() => [
      makeRow('bravo', false, 'none'),
      makeRow('alpha', false, 'none'),
    ]);

    render(<TraceStatistics {...defaultProps} />);
    await screen.findByText('bravo');

    const columnHeaders = screen.getAllByRole('columnheader');
    const groupColumn = columnHeaders.find(header => header.textContent.includes('Group'));
    fireEvent.click(groupColumn);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  it('sorts by count for rows without a subgroup value without exploding', async () => {
    getColumnValues.mockImplementation(() => [
      makeRow('item1', false, 'none', { hasSubgroupValue: false, count: 1 }),
      makeRow('item2', false, 'none', { hasSubgroupValue: true, count: 2 }),
      makeRow('item3', false, 'none', { hasSubgroupValue: false, count: 3 }),
    ]);

    render(<TraceStatistics {...defaultProps} />);
    await screen.findByText('item1');

    const columnHeaders = screen.getAllByRole('columnheader');
    const countColumn = columnHeaders.find(header => header.textContent.includes('Count'));
    fireEvent.click(countColumn);

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });
});

describe('searchInTable', () => {
  it('returns the input rows unchanged in length', () => {
    const rows = [
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
    const searchSet = new Set(['parent1detail1']);

    const result = searchInTable(searchSet, rows, null);
    expect(result).toBeDefined();
    expect(result.length).toBe(3);
  });

  it('highlights rows whose name matches uiFind, including their children', () => {
    const rows = [
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

    const result = searchInTable(undefined, rows, 'searchterm');
    const highlighted = result.filter(item => item.searchColor === 'rgb(255,243,215)');
    expect(highlighted.length).toBeGreaterThan(0);
  });

  it('defaults searchColor to gray when there is no search and no uiFindVertexKeys', () => {
    const rows = [
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

    const result = searchInTable(undefined, rows, null);
    expect(result[0].searchColor).toBe('rgb(248,248,248)');
    expect(result[1].searchColor).toBe('rgb(248,248,248)');
  });

  it('treats a null uiFindVertexKeys the same as undefined, not as a Set to iterate', () => {
    const rows = [
      {
        name: 'item1',
        isDetail: false,
        hasSubgroupValue: true,
        parentElement: 'none',
        searchColor: undefined,
        key: '0',
      },
    ];

    expect(() => searchInTable(null, rows, null)).not.toThrow();
    const result = searchInTable(null, rows, null);
    expect(result[0].searchColor).toBe('transparent');
  });
});
