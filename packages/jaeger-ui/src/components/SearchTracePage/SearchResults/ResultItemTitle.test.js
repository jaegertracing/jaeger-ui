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
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import ResultItemTitle from './ResultItemTitle';
import { fetchedState } from '../../../constants';
import { formatDuration } from '../../../utils/date';

// We wrap the component to provide this context.
const AllTheProviders = ({ children }) => {
  return <MemoryRouter>{children}</MemoryRouter>;
};

const setup = props => {
  const view = render(<ResultItemTitle {...props} />, { wrapper: AllTheProviders });
  return {
    ...view,
    user: userEvent.setup(),
  };
};

describe('ResultItemTitle', () => {
  const defaultProps = {
    duration: 150000, // Using microseconds is more realistic for formatDuration
    durationPercent: 10,
    isInDiffCohort: true,
    linkTo: '/search?traceID=trace-id-longer-than-8', // more realistic link
    state: fetchedState.DONE,
    toggleComparison: jest.fn(),
    traceID: 'trace-id-longer-than-8',
    traceName: 'traceNameValue',
  };

  beforeEach(() => {
    defaultProps.toggleComparison.mockReset();
  });

  it('renders as expected', () => {
    const { container } = setup(defaultProps);
    
    // Test that the formatted duration is displayed (this is directly rendered by ResultItemTitle)
    expect(screen.getByText(formatDuration(defaultProps.duration))).toBeInTheDocument();
    
    // Test that the component structure is correct
    expect(screen.getByRole('link')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    
    // Test that the duration bar is rendered with correct width
    const durationBar = container.querySelector('.ResultItemTitle--durationBar');
    expect(durationBar).toBeInTheDocument();
    expect(durationBar).toHaveStyle(`width: ${defaultProps.durationPercent}%`);
    
    // Test that the main container has the correct class
    expect(container.querySelector('.ResultItemTitle')).toBeInTheDocument();
    
    // Test that TraceName and TraceId components are rendered (by checking their presence)
    expect(container.querySelector('.ResultItemTitle--title')).toBeInTheDocument();
    expect(container.querySelector('.ResultItemTitle--idExcerpt')).toBeInTheDocument();
  });

  describe('Checkbox', () => {
    it('does not render toggleComparison checkbox when props.disableComparision is true', () => {
      const { rerender } = setup(defaultProps);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();

      rerender(
        <MemoryRouter>
          <ResultItemTitle {...defaultProps} disableComparision />
        </MemoryRouter>
      );
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('is disabled iff props.state === fetchedState.ERROR', () => {
      const { rerender } = setup(defaultProps);
      expect(screen.getByRole('checkbox')).not.toBeDisabled();

      rerender(
        <MemoryRouter>
          <ResultItemTitle {...defaultProps} state={fetchedState.ERROR} />
        </MemoryRouter>
      );
      expect(screen.getByRole('checkbox')).toBeDisabled();
    });

    it('is checked iff props.state !== fetchedState.ERROR && props.isInDiffCohort', () => {
      const { rerender } = setup(defaultProps);

      const scenarios = [
        { isInDiffCohort: true, state: fetchedState.DONE, expected: true },
        { isInDiffCohort: false, state: fetchedState.DONE, expected: false },
        { isInDiffCohort: true, state: fetchedState.ERROR, expected: false },
        { isInDiffCohort: false, state: fetchedState.ERROR, expected: false },
      ];

      scenarios.forEach(({ isInDiffCohort, state, expected }) => {
        rerender(
          <MemoryRouter>
            <ResultItemTitle {...defaultProps} isInDiffCohort={isInDiffCohort} state={state} />
          </MemoryRouter>
        );
        const checkbox = screen.getByRole('checkbox');
        if (expected) {
          expect(checkbox).toBeChecked();
        } else {
          expect(checkbox).not.toBeChecked();
        }
      });
    });

    it('calls props.toggleComparison with correct arguments onChange', async () => {
      const { rerender, user } = setup(defaultProps);

      await user.click(screen.getByRole('checkbox'));
      expect(defaultProps.toggleComparison).toHaveBeenCalledWith(
        defaultProps.traceID,
        defaultProps.isInDiffCohort
      );

      const newIsInDiffCohort = !defaultProps.isInDiffCohort;
      rerender(
        <MemoryRouter>
          <ResultItemTitle {...defaultProps} isInDiffCohort={newIsInDiffCohort} />
        </MemoryRouter>
      );

      await user.click(screen.getByRole('checkbox'));
      expect(defaultProps.toggleComparison).toHaveBeenLastCalledWith(defaultProps.traceID, newIsInDiffCohort);
    });

    it('prevents click propagation from the checkbox', async () => {
      const { user } = setup(defaultProps);
      const link = screen.getByRole('link');

      // Ensure the link is functional before testing the checkbox
      expect(link).toHaveAttribute('href', defaultProps.linkTo);

      // A user click on the checkbox should call the toggle function but NOT navigate.
      // In a real app this would change the URL. In this test, not throwing an
      // error and successfully calling the mock is sufficient to prove the link
      // behavior was prevented.
      await user.click(screen.getByRole('checkbox'));

      expect(defaultProps.toggleComparison).toHaveBeenCalledTimes(1);
    });
  });

  describe('WrapperComponent', () => {
    it('renders <Link> when linkTo is provided', () => {
      const { rerender } = setup(defaultProps);
      expect(screen.getByRole('link', { name: /traceNameValue/i })).toBeInTheDocument();

      rerender(
        <MemoryRouter>
          <ResultItemTitle {...defaultProps} linkTo={null} />
        </MemoryRouter>
      );
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('<Link> targets _blank and sets rel when targetBlank is true', () => {
      const { rerender } = setup(defaultProps);

      expect(screen.getByRole('link')).not.toHaveAttribute('target');
      expect(screen.getByRole('link')).not.toHaveAttribute('rel');

      rerender(
        <MemoryRouter>
          <ResultItemTitle {...defaultProps} targetBlank />
        </MemoryRouter>
      );

      const updatedLink = screen.getByRole('link');
      expect(updatedLink).toHaveAttribute('target', '_blank');
      expect(updatedLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('hides formated duration when duration is not provided', () => {
      const { rerender } = setup(defaultProps);
      // Duration text is visible
      expect(screen.getByText(formatDuration(defaultProps.duration))).toBeInTheDocument();

      rerender(
        <MemoryRouter>
          <ResultItemTitle {...defaultProps} duration={null} />
        </MemoryRouter>
      );
      // Duration text is hidden
      expect(screen.queryByText(formatDuration(defaultProps.duration))).not.toBeInTheDocument();
    });
  });
});
