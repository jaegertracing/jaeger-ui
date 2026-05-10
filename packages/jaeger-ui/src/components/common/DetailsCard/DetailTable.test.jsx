// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IoFunnel, IoFunnelOutline } from 'react-icons/io5';

import ExamplesLink from '../ExamplesLink';
import DetailTableDropdown from './DetailTableDropdown';
import DetailTable, {
  _makeColumns,
  _makeFilterDropdown,
  _onCell,
  _onFilter,
  _renderCell,
  _rowKey,
  _sort,
} from './DetailTable';

// Utility to simplify calling functions that expect a column name.
const makeTestFn =
  (fn, dataIndex) =>
  (...vals) =>
    fn(dataIndex)(
      ...vals.map(v => ({
        [dataIndex]: v,
      }))
    );

describe('DetailTable Rendering', () => {
  const col0 = {
    styling: {
      background: 'red',
      color: 'white',
    },
    key: 'col0',
  };
  const col1 = 'col1';
  const row0 = {
    [col0.key]: 'val0',
    [col1]: 'val1',
  };
  const row1 = {
    [col0.key]: 'val2',
    [col1]: 'val3',
  };

  it('renders given rows and columns', () => {
    render(<DetailTable columnDefs={[col1, col0]} details={[row0, row1]} />);

    const headerCells = screen.getAllByRole('columnheader').map(cell => cell.textContent);
    expect(headerCells).toContain('col1');
    expect(headerCells).toContain('col0');

    expect(screen.getByText('val0')).toBeInTheDocument();
    expect(screen.getByText('val1')).toBeInTheDocument();
    expect(screen.getByText('val2')).toBeInTheDocument();
    expect(screen.getByText('val3')).toBeInTheDocument();
  });

  it('infers all columns when no columnDefs provided', () => {
    render(<DetailTable details={[row0]} />);

    expect(screen.getByRole('columnheader', { name: 'col0' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'col1' })).toBeInTheDocument();

    expect(screen.getByText('val0')).toBeInTheDocument();
    expect(screen.getByText('val1')).toBeInTheDocument();
  });

  it('infers missing columns if some provided', () => {
    render(<DetailTable columnDefs={[col0]} details={[row0]} />);

    expect(screen.getByRole('columnheader', { name: 'col0' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'col1' })).toBeInTheDocument();

    expect(screen.getByText('val0')).toBeInTheDocument();
    expect(screen.getByText('val1')).toBeInTheDocument();
  });

  it('does not duplicate columns if already included', () => {
    render(<DetailTable columnDefs={[col1]} details={[row0, row1]} />);

    const headerCells = screen.getAllByRole('columnheader').map(cell => cell.textContent);

    expect(headerCells.filter(h => h === 'col1')).toHaveLength(1);
    expect(headerCells.filter(h => h === 'col0')).toHaveLength(1);
  });
});

describe('_rowKey', () => {
  const column = 'col';
  const examples = [{ spanIDs: ['id0', 'id1'], traceID: 'traceID' }];

  it('handles undefined value', () => {
    const row = { [column]: undefined };
    expect(_rowKey(row)).toBe(JSON.stringify(row));
  });

  it('handles array value', () => {
    const row = { [column]: examples };
    const expected = JSON.stringify({ [column]: JSON.stringify(examples) });
    expect(_rowKey(row)).toBe(expected);
  });

  it('handles object with string value', () => {
    const valueObject = { value: 'test-value' };
    const row = { [column]: valueObject };
    const expected = JSON.stringify({ [column]: JSON.stringify(valueObject) });
    expect(_rowKey(row)).toBe(expected);
  });

  it('handles object with React.Element value that has a key', () => {
    const key = 'test-key';
    const elem = <ExamplesLink key={key} examples={examples} />;
    const row = { [column]: { value: elem } };
    const expected = JSON.stringify({ [column]: key });
    expect(_rowKey(row)).toBe(expected);
  });

  it('handles object with React.Element value without a key', () => {
    const elem = <ExamplesLink examples={examples} />;
    const row = { [column]: { value: elem } };
    const expected = JSON.stringify({ [column]: 'Unknown' });
    expect(_rowKey(row)).toBe(expected);
  });
});

describe('_makeColumns', () => {
  const stringColumn = 'stringCol';
  const makeColumn = (def, rows = []) => _makeColumns({ defs: [def], rows })[0];

  it('renders string column', () => {
    expect(makeColumn(stringColumn)).toEqual({
      dataIndex: stringColumn,
      key: stringColumn,
      title: stringColumn,
      filterDropdown: false,
      filterIcon: expect.any(Function),
      onFilter: expect.any(Function),
      onCell: expect.any(Function),
      onHeaderCell: expect.any(Function),
      render: expect.any(Function),
      sorter: expect.any(Function),
    });
  });

  it('renders object column', () => {
    expect(makeColumn({ key: stringColumn })).toEqual({
      dataIndex: stringColumn,
      key: stringColumn,
      title: stringColumn,
      filterDropdown: false,
      filterIcon: expect.any(Function),
      onFilter: expect.any(Function),
      onCell: expect.any(Function),
      onHeaderCell: expect.any(Function),
      render: expect.any(Function),
      sorter: expect.any(Function),
    });
  });

  it('renders object column with label', () => {
    const label = `label, not-${stringColumn}`;
    expect(
      makeColumn({
        key: stringColumn,
        label,
      })
    ).toEqual({
      dataIndex: stringColumn,
      key: stringColumn,
      title: label,
      filterDropdown: false,
      filterIcon: expect.any(Function),
      onFilter: expect.any(Function),
      onCell: expect.any(Function),
      onHeaderCell: expect.any(Function),
      render: expect.any(Function),
      sorter: expect.any(Function),
    });
  });

  it('renders object column with styling', () => {
    const styling = {
      background: 'red',
      color: 'white',
    };
    expect(
      makeColumn({
        key: stringColumn,
        styling,
      }).onHeaderCell().style
    ).toBe(styling);
  });

  it('renders filter icon without filter set', () => {
    const col = makeColumn(stringColumn);
    const icon = col.filterIcon(false);
    expect(icon.type).toBe(IoFunnelOutline);
  });

  it('renders filter icon with filter set', () => {
    const col = makeColumn(stringColumn);
    const icon = col.filterIcon(true);
    expect(icon.type).toBe(IoFunnel);
  });

  it('renders filterable column if there are filterable values', () => {
    const filterableValues = ['foo', 'bar', { value: 'objFoo' }, { value: 'objBaz' }];
    const expectedOptions = new Set(filterableValues.map(v => (typeof v === 'string' ? v : v.value)));
    const values = [
      ...filterableValues,
      <ExamplesLink examples={[]} key="examples1" />,
      <ExamplesLink examples={[]} key="examples2" />,
      undefined,
    ];
    const rows = values.map(val => ({ [stringColumn]: val }));
    const col = makeColumn(stringColumn, rows);
    const dropdownElement = col.filterDropdown();
    expect(dropdownElement.type).toBe(DetailTableDropdown);
    expect(dropdownElement.props.options).toEqual(expectedOptions);
    expect(dropdownElement.key).toBe(stringColumn);
  });

  it('renders object column without sort', () => {
    expect(
      makeColumn({
        key: stringColumn,
        preventSort: true,
      })
    ).toEqual({
      dataIndex: stringColumn,
      key: stringColumn,
      title: stringColumn,
      filterDropdown: false,
      filterIcon: expect.any(Function),
      onFilter: expect.any(Function),
      onCell: expect.any(Function),
      onHeaderCell: expect.any(Function),
      render: expect.any(Function),
      sorter: false,
    });
  });
});

describe('Function Props', () => {
  const stringColumn = 'stringCol';
  const onCell = makeTestFn(_onCell, stringColumn);
  const onFilter = (filterVal, testVal) => _onFilter(stringColumn)(filterVal, { [stringColumn]: testVal });
  const renderCell = _renderCell;
  const sortFn = makeTestFn(_sort, stringColumn);

  describe('_makeFilterDropdown', () => {
    it('returns a DetailTableDropdown with correct props', () => {
      const options = ['opt1', 'opt2'];
      const mockProps = { test: 'prop' };
      const dropdown = _makeFilterDropdown(stringColumn, options)(mockProps);
      expect(dropdown.type).toBe(DetailTableDropdown);
      expect(dropdown.props).toEqual({ ...mockProps, options });
      expect(dropdown.key).toBe(stringColumn);
    });
  });

  describe('_onCell', () => {
    it('returns empty object for undefined', () => {
      expect(onCell(undefined)).toEqual({});
    });

    it('returns empty object for string', () => {
      expect(onCell('some-string')).toEqual({});
    });

    it('returns empty object for array', () => {
      expect(onCell(['a', 'b'])).toEqual({});
    });

    it('returns empty object for object without styling', () => {
      expect(onCell({})).toEqual({});
      expect(onCell({ styling: {} })).toEqual({});
    });

    it('returns style object when styling is provided', () => {
      const styling = { background: 'blue', color: 'yellow' };
      expect(onCell({ styling }).style).toBe(styling);
    });
  });

  describe('_onFilter', () => {
    const val = 'test-value';

    it('returns true when string matches filter', () => {
      expect(onFilter(val, val)).toBe(true);
    });

    it('returns true when object.value matches filter', () => {
      expect(onFilter(val, { value: val })).toBe(true);
    });

    it('returns false when string does not match', () => {
      expect(onFilter(val, `no-${val}`)).toBe(false);
    });

    it('returns false when object.value does not match', () => {
      expect(onFilter(val, { value: `no-${val}` })).toBe(false);
    });

    it('returns false when value is array', () => {
      expect(onFilter(val, [val])).toBe(false);
    });

    it('returns false when value is undefined', () => {
      expect(onFilter(val, undefined)).toBe(false);
    });
  });

  describe('_renderCell', () => {
    it('renders a bare string', () => {
      expect(renderCell('abc')).toBe('abc');
    });

    it('returns undefined when cellData is undefined', () => {
      expect(renderCell()).toBeUndefined();
    });

    it('renders object.value when provided', () => {
      expect(renderCell({ value: 'myValue' })).toBe('myValue');
    });

    it('renders <ExamplesLink /> for array input', () => {
      const arr = [];
      const result = renderCell(arr);
      expect(React.isValidElement(result)).toBe(true);
      expect(result.type).toBe(ExamplesLink);
      expect(result.props.examples).toBe(arr);
    });

    it('renders an anchor when linkTo is provided', () => {
      const linkCell = { linkTo: 'http://test.url', value: 'clickMe' };
      render(linkCell && <>{renderCell(linkCell)}</>);

      const anchor = screen.getByRole('link', { name: 'clickMe' });
      expect(anchor).toHaveAttribute('href', 'http://test.url');
      expect(anchor).toHaveAttribute('target', '_blank');
      expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('_sort Functionality', () => {
    it('sorts plain strings', () => {
      expect(sortFn('a', 'b')).toBe(-1);
      expect(sortFn('a', 'a')).toBe(0);
      expect(sortFn('b', 'a')).toBe(1);
    });

    it('sorts arrays by length', () => {
      expect(sortFn([1, 2], [1, 2, 3])).toBe(-1);
      expect(sortFn([1, 2], [1, 2])).toBe(0);
      expect(sortFn([1, 2, 3], [1, 2])).toBe(1);
    });

    it('sorts objects with string.value', () => {
      expect(sortFn({ value: 'a' }, { value: 'b' })).toBe(-1);
      expect(sortFn({ value: 'a' }, { value: 'a' })).toBe(0);
      expect(sortFn({ value: 'b' }, { value: 'a' })).toBe(1);
    });

    it('handles objects without string.value gracefully', () => {
      expect(() => sortFn({}, {})).not.toThrow();
    });

    describe('mixed types comparisons', () => {
      it('compares string and object', () => {
        expect(sortFn('a', { value: 'b' })).toBe(-1);
        expect(sortFn('a', { value: 'a' })).toBe(0);
        expect(sortFn('b', { value: 'a' })).toBe(1);
      });

      it('compares object and array', () => {
        expect(sortFn({ value: 'a' }, [1, 2, 3])).toBe(0);
        expect(sortFn({ value: 'b' }, [1, 2])).toBe(0);
      });

      it('compares array and string', () => {
        expect(sortFn([1, 2], 'a')).toBe(0);
        expect(sortFn([1, 2, 3], 'b')).toBe(0);
      });
    });
  });
});
