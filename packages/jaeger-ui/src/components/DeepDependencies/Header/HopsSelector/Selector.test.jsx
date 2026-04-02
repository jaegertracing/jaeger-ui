// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { EDirection, ECheckedStatus } from '../../../../model/ddg/types';
import Selector from './Selector';

// Mock the tracking function as it's called within the component
jest.mock('../../index.track', () => ({
  trackHopChange: jest.fn(),
}));

describe('Selector', () => {
  const handleClick = jest.fn();
  const hopsData = [
    { distance: 0, fullness: ECheckedStatus.Full },
    { distance: 1, fullness: ECheckedStatus.Partial },
    { distance: 2, fullness: ECheckedStatus.Full },
    { distance: 3, fullness: ECheckedStatus.Empty },
    { distance: 4, fullness: ECheckedStatus.Empty },
  ];

  const defaultProps = {
    furthestDistance: 2,
    furthestFullness: ECheckedStatus.Full,
    furthestFullDistance: 2,
    hops: hopsData,
    direction: EDirection.Downstream,
    handleClick,
  };

  beforeEach(() => {
    handleClick.mockClear();
    // Clean up document body to prevent test interference
    document.body.innerHTML = '';
  });

  it('renders message when there are not enough hops', () => {
    // Render with only one hop
    render(<Selector {...defaultProps} hops={[{ distance: 0, fullness: ECheckedStatus.Full }]} />);
    expect(screen.getByText('No downstream hops')).toBeInTheDocument();
  });

  it('renders buttons with expected text and classes for Downstream', () => {
    render(<Selector {...defaultProps} />);

    // Check main display buttons (furthest visible and max hops)
    expect(screen.getByTestId('hop-down-2')).toHaveTextContent('2');
    expect(screen.getByTestId('hop-down-2')).toHaveClass('is-Full');
    expect(screen.getByTestId('hop-down-4')).toHaveTextContent('4');
    expect(screen.getByTestId('hop-down-4')).toHaveClass('is-Empty');

    // Check label
    expect(screen.getByText('Downstream hops')).toBeInTheDocument();
  });

  it('renders buttons with expected text and classes for Upstream', () => {
    const upstreamHops = hopsData.map(h => ({ ...h, distance: -h.distance }));
    render(
      <Selector
        {...defaultProps}
        direction={EDirection.Upstream}
        furthestDistance={-2}
        furthestFullDistance={-2}
        hops={upstreamHops}
      />
    );

    // Check main display buttons (abs value is used for display)
    expect(screen.getByTestId('hop-up-2')).toHaveTextContent('2');
    expect(screen.getByTestId('hop-up-2')).toHaveClass('is-Full');
    expect(screen.getByTestId('hop-up-4')).toHaveTextContent('4');
    expect(screen.getByTestId('hop-up-4')).toHaveClass('is-Empty');

    // Check label
    expect(screen.getByText('Upstream hops')).toBeInTheDocument();
  });

  it('calls handleClick with correct arguments from label buttons', () => {
    render(<Selector {...defaultProps} />);

    // Furthest visible hop button
    fireEvent.click(screen.getByTestId('hop-down-2'));
    expect(handleClick).toHaveBeenCalledWith(2, EDirection.Downstream);

    // Max hop button (delimiter)
    fireEvent.click(screen.getByTestId('hop-down-4'));
    expect(handleClick).toHaveBeenCalledWith(4, EDirection.Downstream);
  });
});
