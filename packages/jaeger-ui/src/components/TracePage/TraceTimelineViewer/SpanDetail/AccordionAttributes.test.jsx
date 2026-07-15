// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AccordionAttributes, { AttributesSummary } from './AccordionAttributes';
import * as markers from './AccordionAttributes.markers';
import { makeAttributes } from '../../../../model/attributes';

// Test-only: serialize an IAttributes collection so the mock can record what
// it received. There is no production need to stringify a whole collection.
const stringifyAttrs = attrs => JSON.stringify(attrs.entries());

vi.mock('./AttributesTable', () => {
  const MockAttributesTable = ({ data, linksGetter }) => (
    <table
      data-testid="key-values-table"
      data-data={stringifyAttrs(data)}
      data-has-links-getter={!!linksGetter}
    />
  );
  return mockDefault(MockAttributesTable);
});

const tagsArray = [
  { key: 'span.kind', value: 'client' },
  { key: 'omg', value: 'mos-def' },
];
const tags = makeAttributes(tagsArray);

describe('<AttributesSummary />', () => {
  it('renders summary list when valid data is provided', () => {
    const { container } = render(<AttributesSummary data={tags} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('returns null when data is empty', () => {
    const { container } = render(<AttributesSummary data={makeAttributes([])} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the correct number of list items', () => {
    const { container } = render(<AttributesSummary data={tags} />);
    const listItems = container.querySelectorAll('li');
    expect(listItems.length).toBe(tagsArray.length);
  });

  it('displays each key-value pair correctly', () => {
    const { container } = render(<AttributesSummary data={tags} />);
    const listItems = container.querySelectorAll('li');
    const texts = Array.from(listItems).map(node => node.textContent);
    const expectedTexts = tagsArray.map(tag => `${tag.key}=${tag.value}`);
    expect(texts).toEqual(expectedTexts);
  });
});

describe('<AccordionAttributes />', () => {
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
    const { container } = render(<AccordionAttributes {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('calls onToggle when header is clicked', () => {
    render(<AccordionAttributes {...defaultProps} />);
    const header = screen.getByText('le-label:').closest('div');
    fireEvent.click(header);
    expect(defaultProps.onToggle).toHaveBeenCalledTimes(1);
  });

  it('does not call onToggle when interactive is false', () => {
    render(<AccordionAttributes {...defaultProps} interactive={false} />);
    const header = screen.getByText('le-label:').closest('div');
    fireEvent.click(header);
    expect(defaultProps.onToggle).not.toHaveBeenCalled();
  });

  it('does not apply high contrast styles by default', () => {
    render(<AccordionAttributes {...defaultProps} />);
    const header = screen.getByText('le-label:').closest('div');
    expect(header).not.toHaveClass('is-high-contrast');
  });

  it('applies high contrast styles when enabled', () => {
    render(<AccordionAttributes {...defaultProps} highContrast />);
    const header = screen.getByText('le-label:').closest('div');
    expect(header).toHaveClass('is-high-contrast');
  });

  it('displays the label with the correct data attribute', () => {
    render(<AccordionAttributes {...defaultProps} />);
    const label = screen.getByText('le-label:');
    expect(label).toHaveAttribute('data-test', markers.LABEL);
  });

  it('shows summary when not expanded', () => {
    const { container } = render(<AccordionAttributes {...defaultProps} />);
    expect(container.querySelector('.AccordionAttributes--summary')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="key-values-table"]')).not.toBeInTheDocument();
  });

  it('shows key-value table when expanded', () => {
    const { container } = render(<AccordionAttributes {...defaultProps} isOpen />);
    expect(container.querySelector('.AccordionAttributes--summary')).not.toBeInTheDocument();
    const table = container.querySelector('[data-testid="key-values-table"]');
    expect(table).toBeInTheDocument();
    expect(table).toHaveAttribute('data-data', stringifyAttrs(tags));
  });

  it('calls onToggle when data is empty and interactive is true', () => {
    const propsWithEmptyData = {
      ...defaultProps,
      data: makeAttributes([]),
    };
    render(<AccordionAttributes {...propsWithEmptyData} />);
    const header = screen.getByText('le-label:').closest('div');
    fireEvent.click(header);
    expect(defaultProps.onToggle).toHaveBeenCalledTimes(1);
  });
});
