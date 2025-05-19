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
import TraceDiffHeader from './TraceDiffHeader';
import { fetchedState } from '../../../constants';

describe('VS Separator in TraceDiffHeader', () => {
  const defaultProps = {
    a: {
      id: 'trace-id-a',
      state: fetchedState.DONE,
      data: {
        duration: 1000,
        startTime: 1000000,
        spans: [{}],
        traceName: 'trace-name-a',
      },
    },
    b: {
      id: 'trace-id-b',
      state: fetchedState.DONE,
      data: {
        duration: 2000,
        startTime: 2000000,
        spans: [{}, {}],
        traceName: 'trace-name-b',
      },
    },
    cohort: [],
    diffSetA: jest.fn(),
    diffSetB: jest.fn(),
  };

  it('renders the VS separator with circular badge design', () => {
    render(<TraceDiffHeader {...defaultProps} />);

    // Check for the VS separator container
    const vsContainer = screen.getByTestId('vs-separator');
    expect(vsContainer).toBeInTheDocument();
    expect(vsContainer).toHaveClass('TraceDiffHeader--vsContainer');

    // Check for the VS label inside the container
    const vsLabel = screen.getByText('VS');
    expect(vsLabel).toBeInTheDocument();

    // Check that the container is inside the divider
    const divider = vsContainer.closest('.TraceDiffHeader--divider');
    expect(divider).toBeInTheDocument();
  });

  it('applies hover effects to the VS separator', () => {
    // We need to check the CSS classes and their properties
    // This is a bit tricky with Jest, so we'll check for the class names
    // that should have the hover effects defined in CSS
    render(<TraceDiffHeader {...defaultProps} />);

    const vsContainer = screen.getByText('VS').closest('.TraceDiffHeader--vsContainer');
    expect(vsContainer).toHaveClass('TraceDiffHeader--vsContainer');

    // The hover effects are defined in CSS with .TraceDiffHeader--vsContainer:hover
    // We can't directly test CSS pseudo-classes with Jest, but we can verify the class exists
  });
});
