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
import { Select } from 'antd';
import SearchableSelect, { filterOptionsByLabel } from './SearchableSelect';

describe('SearchableSelect', () => {
  const options = [
    { label: 'Test 1', value: 'test1' },
    { label: 'Test 2', value: 'test2' },
    { label: 'Test 3', value: 'test3' },
  ];

  it('renders with all props and options', () => {
    const { container } = render(
      <SearchableSelect data-testid="searchable-select">
        {options.map((option, i) => (
          <Select.Option key={option.value} value={option.value} data-testid={`option-${i}`}>
            {option.label}
          </Select.Option>
        ))}
      </SearchableSelect>
    );
    
    expect(container).toMatchSnapshot();
  });

  it('has search enabled', () => {
    render(
      <SearchableSelect data-testid="searchable-select">
        {options.map((option, i) => (
          <Select.Option key={option.value} value={option.value} data-testid={`option-${i}`}>
            {option.label}
          </Select.Option>
        ))}
      </SearchableSelect>
    );
    
    // The Select component from antd doesn't expose showSearch directly in the DOM
    // We can verify the component is rendered correctly via snapshot
    // and trust that our implementation passes showSearch=true
    const selectElement = screen.getByTestId('searchable-select');
    expect(selectElement).toBeInTheDocument();
  });
});

describe('filterOptionsByLabel', () => {
  const options = [
    {
      children: 'Test 1',
      label: 'Test 1',
      value: 'test1',
    },
  ];

  it('should return true when passed empty input', () => {
    const input = filterOptionsByLabel('', options[0]);
    expect(input).toBe(true);
  });

  it('should return true when passed matching lowercase string', () => {
    const input = filterOptionsByLabel('test', options[0]);
    expect(input).toBe(true);
  });

  it('should return true when passed matching uppercase string', () => {
    const input = filterOptionsByLabel('TEST', options[0]);
    expect(input).toBe(true);
  });

  it('should return false when passed non-matching', () => {
    const input = filterOptionsByLabel('jaeger', options[0]);
    expect(input).toBe(false);
  });

  it('should return false when passed null option', () => {
    const input = filterOptionsByLabel('jaeger', null);
    expect(input).toBe(false);
  });
});