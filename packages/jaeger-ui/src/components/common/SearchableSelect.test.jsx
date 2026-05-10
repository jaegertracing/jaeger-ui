// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Select } from 'antd';
import SearchableSelect, { filterOptionsByLabel, filterOptionsFuzzy } from './SearchableSelect';

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

  it('uses fuzzy matching when fuzzy prop is true', async () => {
    render(
      <SearchableSelect fuzzy>
        <Select.Option value="my-service">my-service</Select.Option>
        <Select.Option value="other">other</Select.Option>
      </SearchableSelect>
    );

    const select = screen.getByRole('combobox');
    await userEvent.click(select);
    // "mysvc" should fuzzy match "my-service"
    await userEvent.type(select, 'mysvc');

    // Multiple elements with the same text may exist in the DOM (Ant Design creates duplicates)
    expect(screen.getAllByText('my-service').length).toBeGreaterThan(0);
    expect(screen.queryByText('other')).not.toBeInTheDocument();
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

describe('filterOptionsFuzzy', () => {
  const option = {
    children: 'my-service-name',
    label: 'my-service-name',
    value: 'my-service-name',
  };

  it('should return true when passed empty input', () => {
    expect(filterOptionsFuzzy('', option)).toBe(true);
  });

  it('should return true when passed exact match', () => {
    expect(filterOptionsFuzzy('my-service-name', option)).toBe(true);
  });

  it('should return true when passed partial match', () => {
    expect(filterOptionsFuzzy('service', option)).toBe(true);
  });

  it('should return true when passed fuzzy match', () => {
    // match-sorter handles fuzzy matching well
    expect(filterOptionsFuzzy('mysvc', option)).toBe(true);
  });

  it('should return false when passed non-matching', () => {
    expect(filterOptionsFuzzy('xyz123', option)).toBe(false);
  });

  it('should return false when passed null option', () => {
    expect(filterOptionsFuzzy('test', null)).toBe(false);
  });
});
