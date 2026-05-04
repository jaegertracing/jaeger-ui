// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import TextList from './TextList';

describe('<TextList>', () => {
  const data = ['string 1', 'string 2', 'another string'];

  it('renders without exploding', () => {
    render(<TextList data={data} />);
    // Check if the list container is rendered (optional, but confirms basic rendering)
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('renders a list item for each data element', () => {
    render(<TextList data={data} />);
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(data.length);

    // Verify the content of each list item
    listItems.forEach((item, index) => {
      expect(item).toHaveTextContent(data[index]);
    });
  });

  it('renders nothing if data is empty', () => {
    render(<TextList data={[]} />);
    const listItems = screen.queryAllByRole('listitem');
    expect(listItems).toHaveLength(0);
  });

  it('renders long strings and embedded newlines correctly', () => {
    const longString = 'a'.repeat(300);
    const newlineString = 'Line 1\nLine 2\nLine 3';
    render(<TextList data={[longString, newlineString]} />);
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(2);
    expect(listItems[0]).toHaveTextContent(longString);
    // toHaveTextContent normalizes whitespace, so newlines become spaces
    expect(listItems[1]).toHaveTextContent('Line 1 Line 2 Line 3');
  });
});
