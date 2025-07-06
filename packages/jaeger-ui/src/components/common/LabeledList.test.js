// Copyright (c) 2025 Uber Technologies, Inc.
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
import '@testing-library/jest-dom';
import LabeledList from './LabeledList';

describe('LabeledList', () => {
  const defaultItems = [
    { key: 'one', label: 'Label 1', value: 'Value 1' },
    { key: 'two', label: 'Label 2', value: 'Value 2' },
    { key: 'three', label: 'Label 3', value: 'Value 3' },
  ];

  it('renders all items with correct labels and values', () => {
    render(<LabeledList items={defaultItems} />);
    defaultItems.forEach(item => {
      expect(screen.getByText(item.label)).toBeInTheDocument();
      expect(screen.getByText(item.value)).toBeInTheDocument();
    });
  });

  it('renders dividers between items except after the last one', () => {
    const { container } = render(<LabeledList items={defaultItems} />);
    const dividers = container.querySelectorAll('.ant-divider-vertical');
    expect(dividers.length).toBe(defaultItems.length - 1);
  });

  it('applies custom className and dividerClassName', () => {
    const { container } = render(
      <LabeledList className="custom-list" dividerClassName="custom-divider" items={defaultItems} />
    );
    expect(container.querySelector('ul')?.className).toContain('custom-list');
    const dividers = container.querySelectorAll('.custom-divider');
    expect(dividers.length).toBe(defaultItems.length - 1);
  });

  it('renders correctly with a single item (no divider)', () => {
    const oneItem = [{ key: 'only', label: 'Only Label', value: 'Only Value' }];
    const { container } = render(<LabeledList items={oneItem} />);
    expect(screen.getByText('Only Label')).toBeInTheDocument();
    expect(screen.getByText('Only Value')).toBeInTheDocument();
    expect(container.querySelectorAll('.ant-divider-vertical').length).toBe(0);
  });
});
