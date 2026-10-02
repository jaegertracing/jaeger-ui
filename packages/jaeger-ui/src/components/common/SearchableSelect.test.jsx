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

  describe('allowCustomValue', () => {
    // Ant Design mirrors every option into an accessibility-only listbox, so the option
    // text appears twice; the titles of the visible items are the unambiguous list.
    const offeredOptions = () =>
      [...document.querySelectorAll('.ant-select-item-option')].map(option => option.title);

    const renderWithApple = props => {
      const onChange = jest.fn();
      render(
        <SearchableSelect onChange={onChange} {...props}>
          <Select.Option value="apple">Apple</Select.Option>
        </SearchableSelect>
      );
      return onChange;
    };

    const openAndType = async text => {
      const select = screen.getByRole('combobox');
      await userEvent.click(select);
      await userEvent.type(select, text);
      return select;
    };

    it('offers the typed text as an option and reports it when picked', async () => {
      const onChange = renderWithApple({ allowCustomValue: true });

      await openAndType('cherry');
      expect(offeredOptions()).toEqual(['cherry']);
      await userEvent.click(screen.getByTitle('cherry'));

      expect(onChange).toHaveBeenCalledWith('cherry', expect.objectContaining({ value: 'cherry' }));
    });

    it('offers nothing beyond the given options without the prop', async () => {
      renderWithApple({});

      await openAndType('cherry');

      expect(offeredOptions()).toEqual([]);
    });

    // The typed text would otherwise linger as a phantom option the next time the dropdown
    // opens, since Ant Design has already cleared the text itself.
    it('withdraws the typed option once the dropdown closes', async () => {
      renderWithApple({ allowCustomValue: true });

      const select = await openAndType('cherry');
      await userEvent.click(document.body);
      await userEvent.click(select);

      expect(offeredOptions()).toEqual(['Apple']);
    });

    it('does not duplicate an option the typed text already matches', async () => {
      renderWithApple({ allowCustomValue: true });

      await openAndType('apple');

      expect(offeredOptions()).toEqual(['Apple']);
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
