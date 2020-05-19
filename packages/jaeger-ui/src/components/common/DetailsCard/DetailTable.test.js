// Copyright (c) 2020 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from 'react';
import { shallow } from 'enzyme';
import { Icon } from 'antd';
import FaFilter from 'react-icons/lib/fa/filter.js';

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

describe('DetailTable', () => {
  describe('render', () => {
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
      expect(shallow(<DetailTable columnDefs={[col1, col0]} details={[row0, row1]} />)).toMatchSnapshot();
    });

    it('infers all columns', () => {
      expect(shallow(<DetailTable details={[row0]} />)).toMatchSnapshot();
    });

    it('infers missing columns', () => {
      expect(shallow(<DetailTable columnDefs={[col0]} details={[row0]} />)).toMatchSnapshot();
    });

    it('does not duplicate columns', () => {
      expect(shallow(<DetailTable columnDefs={[col1]} details={[row0, row1]} />)).toMatchSnapshot();
    });
  });

  describe('_rowKey', () => {
    const column = 'col';
    const examples = [{ spanIDs: ['id0', 'id1'], traceID: 'traceID' }];

    it('handles undefined', () => {
      const row = { [column]: undefined };
      expect(_rowKey(row)).toBe(JSON.stringify(row));
    });

    it('handles array', () => {
      const row = { [column]: examples };
      expect(_rowKey(row)).toBe(JSON.stringify({ [column]: JSON.stringify(examples) }));
    });

    it('handles object with string value', () => {
      const valueObject = { value: 'test-value' };
      const row = { [column]: valueObject };
      expect(_rowKey(row)).toBe(JSON.stringify({ [column]: JSON.stringify(valueObject) }));
    });

    it('handles object with React.Element value with key', () => {
      const key = 'test-key';
      const elem = <ExamplesLink key={key} examples={examples} />;
      const row = { [column]: { value: elem } };
      expect(_rowKey(row)).toBe(JSON.stringify({ [column]: key }));
    });

    it('handles object with React.Element value without key', () => {
      const elem = <ExamplesLink examples={examples} />;
      const row = { [column]: { value: elem } };
      expect(_rowKey(row)).toBe(JSON.stringify({ [column]: 'Unknown' }));
    });
  });

  describe('_makeColumns', () => {
    const stringColumn = 'stringCol';

    describe('static props', () => {
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
        const icon = makeColumn(stringColumn).filterIcon();
        expect(icon.type).toBe(Icon);
        expect(icon.props.type).toBe('filter');
      });

      it('renders filter icon with filter set', () => {
        const icon = makeColumn(stringColumn).filterIcon(true);
        expect(icon.type).toBe(FaFilter);
      });

      it('renders filterable column if there are filterable values', () => {
        const filterableValues = ['foo', 'bar', { value: 'obj foo' }, { value: 'obj baz' }];
        const expected = new Set(filterableValues.map(v => v.value || v));
        const values = [
          ...filterableValues,
          <ExamplesLink examples={[]} />,
          <ExamplesLink key="fookey" examples={[]} />,
          undefined,
        ];
        const rows = values.map(value => ({
          [stringColumn]: value,
        }));
        const column = makeColumn(stringColumn, rows);
        const dropdown = column.filterDropdown();

        expect(dropdown.props.options).toEqual(expected);
        expect(dropdown.type).toBe(DetailTableDropdown);
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

    describe('function props', () => {
      const makeTestFn = fn => (...vals) =>
        fn(stringColumn)(
          ...vals.map(v => ({
            [stringColumn]: v,
          }))
        );

      describe('_makeFilterDropdown', () => {
        it('returns DetailsTableDropdown with correct props', () => {
          const options = ['foo', 'bar'];
          const mockAntdDropdownProps = {
            foo: 'bar',
            bar: 'baz',
            baz: 'foo',
          };
          const filterDropdown = _makeFilterDropdown(stringColumn, options)(mockAntdDropdownProps);

          expect(filterDropdown.type).toBe(DetailTableDropdown);
          expect(filterDropdown.props).toEqual({
            ...mockAntdDropdownProps,
            options,
          });
          expect(filterDropdown.key).toBe(stringColumn);
        });
      });

      describe('_onCell', () => {
        const onCell = makeTestFn(_onCell);

        it('returns null for undefined', () => {
          expect(onCell(undefined)).toBe(null);
        });

        it('returns null for string', () => {
          expect(onCell('test-string')).toBe(null);
        });

        it('returns null for array', () => {
          expect(onCell([])).toBe(null);
        });

        it('returns null for unstyled object', () => {
          expect(onCell({})).toBe(null);
          expect(onCell({ styling: {} })).toBe(null);
        });

        it('returns styling for styled object', () => {
          const styling = {
            background: 'red',
            color: 'white',
          };
          expect(onCell({ styling }).style).toBe(styling);
        });
      });

      describe('_onFilter', () => {
        const onFilter = (filterValue, testValue) =>
          _onFilter(stringColumn)(filterValue, { [stringColumn]: testValue });
        const value = 'test-value';

        it('returns true if string value is filter', () => {
          expect(onFilter(value, value)).toBe(true);
        });

        it('returns true if object value is filter', () => {
          expect(onFilter(value, { value })).toBe(true);
        });

        it('returns false if string value is not filter', () => {
          expect(onFilter(value, `not-${value}`)).toBe(false);
        });

        it('returns false if object value is not filter', () => {
          expect(onFilter(value, { value: `not-${value}` })).toBe(false);
        });

        it('returns false for array value', () => {
          expect(onFilter(value, [value])).toBe(false);
        });

        it('returns false for undefined value', () => {
          expect(onFilter(value)).toBe(false);
        });
      });

      describe('_renderCell', () => {
        it('renders a string', () => {
          expect(_renderCell('a')).toBe('a');
        });

        it('handles undefined', () => {
          expect(_renderCell()).toBe(undefined);
        });

        it("renders an object's value", () => {
          const value = 'test-value';
          expect(_renderCell({ value })).toBe(value);
        });

        it('renders <ExamplesLink />', () => {
          const examples = [];
          const exampleLink = _renderCell(examples);
          expect(exampleLink.type).toBe(ExamplesLink);
          expect(exampleLink.props.examples).toBe(examples);
        });

        it('renders a regular link', () => {
          expect(_renderCell({ linkTo: 'test.link', value: 'test-value' })).toMatchSnapshot();
        });
      });

      describe('_sort ', () => {
        const sort = makeTestFn(_sort);

        it('sorts strings', () => {
          expect(sort('a', 'b')).toBe(-1);
          expect(sort('a', 'a')).toBe(0);
          expect(sort('b', 'a')).toBe(1);
        });

        it('sorts arrays by length', () => {
          expect(sort(new Array(2), new Array(3))).toBe(-1);
          expect(sort(new Array(2), new Array(2))).toBe(0);
          expect(sort(new Array(3), new Array(2))).toBe(1);
        });

        it('sorts objects with string values', () => {
          expect(sort({ value: 'a' }, { value: 'b' })).toBe(-1);
          expect(sort({ value: 'a' }, { value: 'a' })).toBe(0);
          expect(sort({ value: 'b' }, { value: 'a' })).toBe(1);
        });

        it('handles objects without string values', () => {
          expect(() => sort({}, {})).not.toThrow();
        });

        describe('mixed types', () => {
          it('sorts a string and an object', () => {
            expect(sort('a', { value: 'b' })).toBe(-1);
            expect(sort('a', { value: 'a' })).toBe(0);
            expect(sort('b', { value: 'a' })).toBe(1);
          });

          it('sorts an object and an array', () => {
            expect(sort({ value: 'a' }, new Array(3))).toBe(0);
            expect(sort({ value: 'a' }, new Array(2))).toBe(0);
            expect(sort({ value: 'b' }, new Array(2))).toBe(0);
          });

          it('sorts an array and a string', () => {
            expect(sort(new Array(2), 'a')).toBe(0);
            expect(sort(new Array(2), 'a')).toBe(0);
            expect(sort(new Array(3), 'b')).toBe(0);
          });
        });
      });
    });
  });
});
