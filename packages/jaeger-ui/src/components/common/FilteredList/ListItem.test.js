// Copyright (c) 2019 Uber Technologies, Inc.
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
import ListItem from './ListItem';

describe('<ListItem>', () => {
  const defaultProps = {
    style: {},
    index: 0,
    data: {
      setValue: jest.fn(),
      focusedIndex: null,
      highlightQuery: '',
      options: ['a', 'b'],
      selectedValue: null,
    },
  };

  const renderItem = (props = {}) => {
    const mergedProps = { ...defaultProps, ...props };
    return render(<ListItem {...mergedProps} />);
  };

  beforeEach(() => {
    defaultProps.data.setValue.mockReset();
  });

  it('renders and highlights correct option', () => {
    renderItem();
    expect(screen.getByText('a')).toBeInTheDocument();
  });

  it('is focused when index matches focusedIndex', () => {
    renderItem({ data: { ...defaultProps.data, focusedIndex: 0 } });
    const item = screen.getByRole('switch');
    expect(item).toHaveClass('is-focused');
    expect(item).toHaveAttribute('aria-checked', 'true');
  });

  it('is selected when option equals selectedValue', () => {
    renderItem({ data: { ...defaultProps.data, selectedValue: 'a' } });
    const item = screen.getByRole('switch');
    expect(item).toHaveClass('is-selected');
  });

  it('calls setValue when clicked (single mode)', () => {
    renderItem();
    fireEvent.click(screen.getByRole('switch'));
    expect(defaultProps.data.setValue).toHaveBeenCalledWith('a');
  });

  describe('multi mode', () => {
    const addValues = jest.fn();
    const removeValues = jest.fn();

    beforeEach(() => {
      addValues.mockReset();
      removeValues.mockReset();
    });

    it('renders checkbox in multi mode', () => {
      renderItem({ data: { ...defaultProps.data, multi: true } });
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('renders as selected when value is selected', () => {
      renderItem({
        data: {
          ...defaultProps.data,
          multi: true,
          selectedValue: 'a',
        },
      });
      const item = screen.getByRole('switch');
      expect(item).toHaveClass('is-selected');
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('renders as selected with multiple values in Set', () => {
      renderItem({
        data: {
          ...defaultProps.data,
          multi: true,
          selectedValue: new Set(['a', 'b']),
        },
      });
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('does not error if only addValues or removeValues is passed', () => {
      expect(() =>
        renderItem({
          data: { ...defaultProps.data, multi: true, addValues },
        })
      ).not.toThrow();

      fireEvent.click(screen.getByRole('switch'));
      expect(addValues).not.toHaveBeenCalled();
    });

    it('calls addValues when not selected', () => {
      renderItem({
        data: {
          ...defaultProps.data,
          multi: true,
          addValues,
          removeValues,
        },
      });
      fireEvent.click(screen.getByRole('switch'));
      expect(addValues).toHaveBeenCalledWith(['a']);
      expect(removeValues).not.toHaveBeenCalled();
    });

    it('calls removeValues when already selected', () => {
      renderItem({
        data: {
          ...defaultProps.data,
          multi: true,
          selectedValue: 'a',
          addValues,
          removeValues,
        },
      });
      fireEvent.click(screen.getByRole('switch'));
      expect(removeValues).toHaveBeenCalledWith(['a']);
      expect(addValues).not.toHaveBeenCalled();
    });
  });
});
