// Copyright (c) 2019 Uber Technologies, Inc.
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

import TextList from './TextList';

describe('<TextList>', () => {
  const data = ['string 1', 'string 2', 'another string'];

  it('renders without exploding', () => {
    render(<TextList data={data} / data-testid="textlist">);
    // Check if the list container is rendered (optional, but confirms basic rendering)
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('renders a list item for each data element', () => {
    render(<TextList data={data} / data-testid="textlist">);
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(data.length);

    // Verify the content of each list item
    listItems.forEach((item, index) => {
      expect(item).toHaveTextContent(data[index]);
    });
  });

  it('renders nothing if data is empty', () => {
    render(<TextList data={[]} / data-testid="textlist">);
    const listItems = screen.queryAllByRole('listitem');
    expect(listItems).toHaveLength(0);
  });
});
