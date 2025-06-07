// Copyright (c) 2023 The Jaeger Authors
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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Select } from 'antd';
import SearchableSelect, { filterOptionsByLabel } from './SearchableSelect';

describe('SearchableSelect', () => {
  const options = [
    { label: 'Test 1', value: 'test1' },
    { label: 'Test 2', value: 'test2' },
    { label: 'Test 3', value: 'test3' },
  ];

  it('SearchableSelect renders with all props and options', async () => {
    render(
      <SearchableSelect>
        {options.map((option, i) => (
          <Select.Option key={option.value} value={option.value} data-testid={`option-${i}`}>
            {option.label}
          </Select.Option>
        ))}
      </SearchableSelect>
    );

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(select);

    await Promise.all([
      screen.findByTestId('option-0'),
      screen.findByTestId('option-1'),
      screen.findByTestId('option-2'),
    ]);

    expect(screen.getByTestId('option-0')).toHaveTextContent('Test 1');
    expect(screen.getByTestId('option-1')).toHaveTextContent('Test 2');
    expect(screen.getByTestId('option-2')).toHaveTextContent('Test 3');
  });

  it('search is enabled', () => {
    render(<SearchableSelect />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('role', 'combobox');
  });

  it('renders all the options correctly', async () => {
    render(
      <SearchableSelect>
        {options.map((option, i) => (
          <Select.Option key={option.value} value={option.value} data-testid={`option-${i}`}>
            {option.label}
          </Select.Option>
        ))}
      </SearchableSelect>
    );

    await userEvent.click(screen.getByRole('combobox'));

    options.forEach((option, i) => {
      const optEl = screen.getByTestId(`option-${i}`);
      expect(optEl).toHaveTextContent(option.label);
    });
  });
});

describe('filterOptionsByLabel', () => {
  const option = {
    children: 'Test 1',
    label: 'Test 1',
    value: 'test1',
  };

  it('should return true when passed empty input', () => {
    expect(filterOptionsByLabel('', option)).toBe(true);
  });

  it('should return true when passed matching lowercase string', () => {
    expect(filterOptionsByLabel('test', option)).toBe(true);
  });

  it('should return true when passed matching uppercase string', () => {
    expect(filterOptionsByLabel('TEST', option)).toBe(true);
  });

  it('should return false when passed non-matching', () => {
    expect(filterOptionsByLabel('jaeger', option)).toBe(false);
  });

  it('should return false when passed null option', () => {
    expect(filterOptionsByLabel('jaeger', null)).toBe(false);
  });
});
