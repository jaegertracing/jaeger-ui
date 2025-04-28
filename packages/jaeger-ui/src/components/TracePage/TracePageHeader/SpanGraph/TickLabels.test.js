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
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import TickLabels from './TickLabels';
import { formatDuration } from '../../../../utils/date';

// Mock the formatDuration function
jest.mock('../../../../utils/date', () => ({
  formatDuration: jest.fn(duration => `formatted:${duration}`),
}));

describe('<TickLabels>', () => {
  const defaultProps = {
    numTicks: 4,
    duration: 5000,
  };

  beforeEach(() => {
    // Reset the mock before each test if needed, though it might not be strictly necessary here
    formatDuration.mockClear();
    render(<TickLabels {...defaultProps} />);
  });

  it('renders the right number of ticks', () => {
    const ticks = screen.getAllByTestId('tick');
    expect(ticks.length).toBe(defaultProps.numTicks + 1);
  });

  it('renders the correct tick labels', () => {
    expect(formatDuration).toHaveBeenCalledTimes(defaultProps.numTicks + 1);
    expect(formatDuration).toHaveBeenCalledWith(0); // 0/4 * 5000
    expect(formatDuration).toHaveBeenCalledWith(1250); // 1/4 * 5000
    expect(formatDuration).toHaveBeenCalledWith(2500); // 2/4 * 5000
    expect(formatDuration).toHaveBeenCalledWith(3750); // 3/4 * 5000
    expect(formatDuration).toHaveBeenCalledWith(5000); // 4/4 * 5000

    expect(screen.getByText('formatted:0')).toBeInTheDocument();
    expect(screen.getByText('formatted:1250')).toBeInTheDocument();
    expect(screen.getByText('formatted:2500')).toBeInTheDocument();
    expect(screen.getByText('formatted:3750')).toBeInTheDocument();
    expect(screen.getByText('formatted:5000')).toBeInTheDocument();
  });

  it('places the first tick on the left', () => {
    const ticks = screen.getAllByTestId('tick');
    expect(ticks[0]).toHaveStyle('left: 0%');
  });

  it('places the last tick on the right', () => {
    const ticks = screen.getAllByTestId('tick');
    expect(ticks[ticks.length - 1]).toHaveStyle('right: 0%');
  });

  it('places middle ticks at proper intervals', () => {
    const ticks = screen.getAllByTestId('tick');
    // Skip first (index 0) and last (index numTicks)
    const positions = ['25%', '50%', '75%'];
    positions.forEach((pos, i) => {
      // Tick elements are indexed starting from 0,
      // middle ticks start at index 1
      expect(ticks[i + 1]).toHaveStyle(`left: ${pos}`);
    });
  });

  // Removed the "doesn't explode if no trace is present" test as 'trace' is not a prop
});
