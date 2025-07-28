// Copyright (c) 2017 Uber Technologies, Inc.
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
import AccordianKeyValues, { KeyValuesSummary } from './AccordianKeyValues';
import * as markers from './AccordianKeyValues.markers';

jest.mock('./KeyValuesTable', () => {
  const MockKeyValuesTable = ({ data, linksGetter }) => (
    <table
      data-testid="key-values-table"
      data-data={JSON.stringify(data)}
      data-has-links-getter={!!linksGetter}
    />
  );
  return MockKeyValuesTable;
});

const tags = [
  { key: 'span.kind', value: 'client' },
  { key: 'omg', value: 'mos-def' },
];

describe('<KeyValuesSummary />', () => {
  it('renders summary list when valid data is provided', () => {
    const { container } = render(<KeyValuesSummary data={tags} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('returns null when data is null or empty', () => {
    const { container } = render(<KeyValuesSummary data={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the correct number of list items', () => {
    const { container } = render(<KeyValuesSummary data={tags} />);
    const listItems = container.querySelectorAll('li');
    expect(listItems.length).toBe(tags.length);
  });

  it('displays each key-value pair correctly', () => {
    const { container } = render(<KeyValuesSummary data={tags} />);
    const listItems = container.querySelectorAll('li');
    const texts = Array.from(listItems).map(node => node.textContent);
    const expectedTexts = tags.map(tag => `${tag.key}=${tag.value}`);
    expect(texts).toEqual(expectedTexts);
  });
});

describe('<AccordianKeyValues />', () => {
  const defaultProps = {
    data: tags,
    isOpen: false,
    label: 'le-label',
    onToggle: jest.fn(),
    linksGetter: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component without crashing', () => {
    const { container } = render(<AccordianKeyValues {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('calls onToggle when header is clicked', () => {
    render(<AccordianKeyValues {...defaultProps} />);
    const header = screen.getByText('le-label:').closest('div');
    fireEvent.click(header);
    expect(defaultProps.onToggle).toHaveBeenCalledTimes(1);
  });

  it('does not call onToggle when interactive is false', () => {
    render(<AccordianKeyValues {...defaultProps} interactive={false} />);
    const header = screen.getByText('le-label:').closest('div');
    fireEvent.click(header);
    expect(defaultProps.onToggle).not.toHaveBeenCalled();
  });

  it('does not apply high contrast styles by default', () => {
    render(<AccordianKeyValues {...defaultProps} />);
    const header = screen.getByText('le-label:').closest('div');
    expect(header).not.toHaveClass('is-high-contrast');
  });

  it('applies high contrast styles when enabled', () => {
    render(<AccordianKeyValues {...defaultProps} highContrast />);
    const header = screen.getByText('le-label:').closest('div');
    expect(header).toHaveClass('is-high-contrast');
  });

  it('displays the label with the correct data attribute', () => {
    render(<AccordianKeyValues {...defaultProps} />);
    const label = screen.getByText('le-label:');
    expect(label).toHaveAttribute('data-test', markers.LABEL);
  });

  it('shows summary when not expanded', () => {
    const { container } = render(<AccordianKeyValues {...defaultProps} />);
    expect(container.querySelector('.AccordianKeyValues--summary')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="key-values-table"]')).not.toBeInTheDocument();
  });

  it('shows key-value table when expanded', () => {
    const { container } = render(<AccordianKeyValues {...defaultProps} isOpen />);
    expect(container.querySelector('.AccordianKeyValues--summary')).not.toBeInTheDocument();
    const table = container.querySelector('[data-testid="key-values-table"]');
    expect(table).toBeInTheDocument();
    expect(table).toHaveAttribute('data-data', JSON.stringify(tags));
  });
});
