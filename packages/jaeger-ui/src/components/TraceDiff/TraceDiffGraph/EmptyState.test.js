// Copyright (c) 2023 Uber Technologies, Inc.
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
import { UnconnectedTraceDiffGraph as TraceDiffGraph } from './TraceDiffGraph';

// Mock window.location.href for testing navigation
const originalLocation = window.location;

describe('TraceDiffGraph Empty State', () => {
  beforeAll(() => {
    delete window.location;
    window.location = { href: '' };
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  beforeEach(() => {
    window.location.href = '';
    window.open = jest.fn();
  });

  it('renders the empty state visualization when traces are not provided', () => {
    render(<TraceDiffGraph />);

    // Check for the empty state container
    const emptyState = screen.getByTestId('trace-diff-empty-state');
    expect(emptyState).toBeInTheDocument();

    // Check for the SVG visualization
    const svg = emptyState.querySelector('svg');
    expect(svg).toBeInTheDocument();

    // Check for the A and B text elements in the visualization
    const textA = screen.getByText('A');
    const textB = screen.getByText('B');
    expect(textA).toBeInTheDocument();
    expect(textB).toBeInTheDocument();

    // Check for the title and description
    expect(screen.getByText('At least two Traces are needed')).toBeInTheDocument();
    expect(
      screen.getByText('Select traces using the dropdowns above or from the search results page')
    ).toBeInTheDocument();
  });

  it('renders the "Go to Search" button that navigates to search page', () => {
    render(<TraceDiffGraph />);

    // Check for the button
    const searchButton = screen.getByTestId('go-to-search-button');
    expect(searchButton).toBeInTheDocument();
    expect(searchButton).toHaveTextContent('Go to Search');

    // Click the button and check if it navigates to the search page
    fireEvent.click(searchButton);
    expect(window.location.href).toBe('/search');
  });

  it('renders the "Learn how to compare traces" button that opens the blog post', () => {
    render(<TraceDiffGraph />);

    // Check for the button
    const learnButton = screen.getByTestId('learn-how-button');
    expect(learnButton).toBeInTheDocument();
    expect(learnButton).toHaveTextContent('Learn how to compare traces');

    // Click the button and check if it opens the blog post in a new tab
    fireEvent.click(learnButton);
    expect(window.open).toHaveBeenCalledWith(
      'https://medium.com/jaegertracing/trace-comparisons-arrive-in-jaeger-1-7-a97ad5e2d05d',
      '_blank'
    );
  });
});
