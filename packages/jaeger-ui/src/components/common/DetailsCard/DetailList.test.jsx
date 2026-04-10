// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import DetailList from './DetailList';

describe('DetailList', () => {
  const details = ['foo', 'bar', 'baz'];

  it('renders list items with the provided details', () => {
    render(<DetailList details={details} />);

    // Check if each detail string is rendered within a list item
    details.forEach(detail => {
      // Antd List renders items with role='listitem' implicitly
      // We find the list item and check if it contains the expected text
      const listItem = screen.getByText(detail).closest('li');
      expect(listItem).toBeInTheDocument();
      expect(listItem).toHaveTextContent(detail);
    });

    // Optionally, check the total number of list items
    expect(screen.getAllByRole('listitem')).toHaveLength(details.length);
  });
});
