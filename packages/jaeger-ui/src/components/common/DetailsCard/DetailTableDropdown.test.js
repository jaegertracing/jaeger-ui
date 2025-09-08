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
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import DetailTableDropdown from './DetailTableDropdown';
import FilteredList from '../FilteredList';

jest.mock('../FilteredList', () => jest.fn(() => <div data-testid="FilteredList" />));

describe('DetailTableDropdown', () => {
  const optionsArray = ['foo', 'bar', 'baz'];
  const options = new Set(optionsArray);
  const selectedKeys = ['bar', 'baz'];
  const confirm = jest.fn();
  const clearFilters = jest.fn();
  const setSelectedKeys = jest.fn();

  const baseProps = {
    options,
    selectedKeys,
    confirm,
    clearFilters,
    setSelectedKeys,
  };

  beforeEach(() => {
    confirm.mockReset();
    clearFilters.mockReset();
    setSelectedKeys.mockReset();
    FilteredList.mockImplementation(() => <div data-testid="FilteredList" />);
  });

  describe('render', () => {
    it('renders without crashing and shows expected UI elements', () => {
      render(<DetailTableDropdown {...baseProps} />);
      expect(screen.getByTestId('FilteredList')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear filter/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
    });

    it('filters duplicates and numbers out of selectedKeys', () => {
      let filteredValue;
      FilteredList.mockImplementation(({ value }) => {
        filteredValue = value;
        return <div data-testid="FilteredList" />;
      });

      const dupedKeysWithNumbers = selectedKeys.concat(selectedKeys).concat([4, 8, 15]);
      render(<DetailTableDropdown {...baseProps} selectedKeys={dupedKeysWithNumbers} />);
      expect(filteredValue).toEqual(new Set(selectedKeys));
    });

    it('handles missing clearFilters prop', () => {
      render(<DetailTableDropdown {...{ ...baseProps, clearFilters: undefined }} />);
      const clearBtn = screen.getByRole('button', { name: /clear filter/i });
      expect(() => fireEvent.click(clearBtn)).not.toThrow();
    });
  });

  describe('cancel behavior', () => {
    const altSelected = ['foo'];

    const simulateOpenClose = rerender => {
      rerender(<DetailTableDropdown {...baseProps} selectedKeys={[...altSelected]} />);
      rerender(<DetailTableDropdown {...baseProps} selectedKeys={[...altSelected]} />);
    };

    it('sets selected on open/close cycle and uses it on cancel', () => {
      const { rerender } = render(<DetailTableDropdown {...baseProps} selectedKeys={altSelected} />);

      simulateOpenClose(rerender);
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(setSelectedKeys).toHaveBeenCalledWith(altSelected);

      rerender(<DetailTableDropdown {...baseProps} selectedKeys={[...altSelected]} />);
      expect(confirm).toHaveBeenCalled();
    });

    it('maintains internal selected if selectedKeys change', () => {
      const { rerender } = render(<DetailTableDropdown {...baseProps} selectedKeys={[...selectedKeys]} />);

      rerender(<DetailTableDropdown {...baseProps} selectedKeys={[...selectedKeys]} />);
      rerender(<DetailTableDropdown {...baseProps} selectedKeys={[...selectedKeys]} />);

      const differentSelection = ['foo'];
      rerender(<DetailTableDropdown {...baseProps} selectedKeys={differentSelection} />);

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(setSelectedKeys).toHaveBeenCalledWith(selectedKeys);
    });
  });

  describe('FilteredList interactions', () => {
    const getFn = propName => {
      let fn;
      FilteredList.mockImplementation(props => {
        fn = props[propName];
        return <div data-testid="FilteredList" />;
      });
      render(<DetailTableDropdown {...baseProps} />);
      return fn;
    };

    it('calls setSelectedKeys with added values', () => {
      const addValues = getFn('addValues');
      addValues(['new']);
      expect(setSelectedKeys).toHaveBeenCalledWith([...selectedKeys, 'new']);
    });

    it('calls setSelectedKeys with removed values', () => {
      const removeValues = getFn('removeValues');
      removeValues([selectedKeys[0]]);
      expect(setSelectedKeys).toHaveBeenCalledWith([selectedKeys[1]]);
    });

    it('calls setSelectedKeys with a single new value', () => {
      const setValue = getFn('setValue');
      setValue('foo');
      expect(setSelectedKeys).toHaveBeenCalledWith(['foo']);
    });
  });
});
