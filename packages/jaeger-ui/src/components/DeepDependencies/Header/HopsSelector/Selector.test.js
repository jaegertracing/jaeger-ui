// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { EDirection, ECheckedStatus } from '../../../../model/ddg/types';
import Selector from './Selector';
import { trackHopChange } from '../../index.track';

jest.mock('antd', () => {
  const actual = jest.requireActual('antd');
  return {
    ...actual,
    Popover: ({ content, children }) => (
      <div>
        <div data-testid="mock-popover">{children}</div>
        <div data-testid="mock-popover-content">{content}</div>
      </div>
    ),
  };
});

jest.mock('../../index.track', () => ({
  trackHopChange: jest.fn(),
}));

describe('Selector (functional)', () => {
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
    jest.clearAllMocks();
  });

  it('renders message when there are not enough hops', () => {
    render(<Selector {...defaultProps} hops={[{ distance: 0, fullness: ECheckedStatus.Full }]} />);
    expect(screen.getByText('No downstream hops')).toBeInTheDocument();
  });

  it('renders downstream label and main buttons', () => {
    render(<Selector {...defaultProps} />);

    expect(screen.getByText('Downstream hops')).toBeInTheDocument();
    expect(screen.getByTestId('hop-down-2')).toHaveTextContent('2');
    expect(screen.getByTestId('hop-down-4')).toHaveTextContent('4');
  });

  it('renders upstream label and buttons correctly', () => {
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

    expect(screen.getByText('Upstream hops')).toBeInTheDocument();
    expect(screen.getByTestId('hop-up-2')).toHaveTextContent('2');
    expect(screen.getByTestId('hop-up-4')).toHaveTextContent('4');
  });

  it('calls handleClick and tracking when hop button is clicked', () => {
    render(<Selector {...defaultProps} />);

    fireEvent.click(screen.getByTestId('hop-down-2'));

    expect(handleClick).toHaveBeenCalledWith(2, EDirection.Downstream);
    expect(trackHopChange).toHaveBeenCalledWith(2, 2, EDirection.Downstream);
  });

  it('opens popover and renders hop buttons inside it', () => {
    render(<Selector {...defaultProps} />);

    const popover = screen.getByTestId('mock-popover-content');
    expect(popover).toBeInTheDocument();

    expect(screen.getByTestId('hop-down-0-popover')).toBeInTheDocument();
    expect(screen.getByTestId('hop-down-1-popover')).toBeInTheDocument();
    expect(screen.getByTestId('hop-down-2-popover')).toBeInTheDocument();
  });

  it('increment and decrement buttons work correctly', () => {
    render(<Selector {...defaultProps} />);

    fireEvent.click(screen.getByTestId('increment-down'));
    expect(handleClick).toHaveBeenCalledWith(3, EDirection.Downstream);

    fireEvent.click(screen.getByTestId('decrement-down'));
    expect(handleClick).toHaveBeenCalledWith(1, EDirection.Downstream);
  });
  it('disables increment button at max distance', () => {
    render(<Selector {...defaultProps} furthestDistance={4} />);
    expect(screen.getByTestId('increment-down')).toBeDisabled();
  });

  it('disables decrement button at zero distance', () => {
    render(<Selector {...defaultProps} furthestDistance={0} />);
    expect(screen.getByTestId('decrement-down')).toBeDisabled();
  });
});
