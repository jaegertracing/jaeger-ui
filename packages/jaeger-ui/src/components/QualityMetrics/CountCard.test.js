// Copyright (c) 2020 Uber Technologies, Inc.
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
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import CountCard from './CountCard';

describe('CountCard', () => {
  const count = 108;
  const title = 'Test Title';
  const examples = ['Examples'];

  it('renders null when props.count or props.title is absent', () => {
    const { container: containerWithoutCount } = render(<CountCard count={count} />);
    expect(containerWithoutCount.firstChild).toBe(null);
    const { container: containerWithoutTitle } = render(<CountCard title={title} />);
    expect(containerWithoutTitle.firstChild).toBe(null);
  });

  it('renders as expected when given count and title', () => {
    const { getByText } = render(<CountCard count={count} title={title} />);
    const countElement = getByText('108');
    const titleElement = getByText('Test Title');

    expect(countElement).toBeInTheDocument();
    expect(titleElement).toBeInTheDocument();
  });

  it('renders as expected when given count, title, and examples', () => {
    const { getByText } = render(<CountCard count={count} title={title} examples={examples} />);

    const countElement = getByText('108');
    const titleElement = getByText('Test Title');
    const exampleElement = getByText('Examples');
    expect(exampleElement).toBeInTheDocument();

    expect(countElement).toBeInTheDocument();
    expect(titleElement).toBeInTheDocument();
    // examples.forEach(example => {
    //   const exampleElement = getByText(example);
    //   expect(exampleElement).toBeInTheDocument();
    // });
  });
});
