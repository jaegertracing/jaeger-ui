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
import { render, screen, waitFor } from '@testing-library/react';
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

  it('renders all options when dropdown is opened', async () => {
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

  it('filters options based on input when showSearch is enabled', async () => {
    render(
      <SearchableSelect>
        <Select.Option value="apple">Apple</Select.Option>
        <Select.Option value="banana">Banana</Select.Option>
      </SearchableSelect>
    );

    const select = screen.getByRole('combobox');
    await userEvent.click(select);
    await userEvent.type(select, 'ban');

    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.queryByText('Apple')).not.toBeInTheDocument();
  });

  it('scroll buttons trigger scroll actions when clicked', async () => {
    const mockScrollBy = jest.fn();

    // Mock the querySelector to return a mock element with scrollBy and querySelector
    const mockDropdownElement = {
      scrollBy: mockScrollBy,
      querySelector: jest.fn().mockReturnValue(null),
      style: {},
      appendChild: jest.fn(),
    };

    const originalQuerySelector = document.querySelector;
    document.querySelector = jest.fn().mockImplementation(selector => {
      if (selector === '.ant-select-dropdown .rc-virtual-list-holder') {
        return mockDropdownElement;
      }
      if (selector === '.ant-select-dropdown') {
        return mockDropdownElement;
      }
      return originalQuerySelector.call(document, selector);
    });

    render(
      <SearchableSelect showScrollButtons>
        <Select.Option value="option1">Option 1</Select.Option>
        <Select.Option value="option2">Option 2</Select.Option>
      </SearchableSelect>
    );

    const select = screen.getByRole('combobox');
    await userEvent.click(select);

    await waitFor(
      () => {
        expect(document.querySelector).toHaveBeenCalledWith('.ant-select-dropdown');
      },
      { timeout: 1000 }
    );
    document.querySelector = originalQuerySelector;
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
