// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import '@testing-library/jest-dom';

import ResultItemTitle from './ResultItemTitle';
import { fetchedState } from '../../../constants';
import { formatDuration } from '../../../utils/date';

const setup = (props, history) => {
  // A variable for a component must be capitalized (PascalCase) for JSX to recognize it.
  const RenderContainer = history ? Router : MemoryRouter;
  const view = render(<ResultItemTitle {...props} />, {
    wrapper: ({ children }) => <RenderContainer history={history}>{children}</RenderContainer>,
  });
  return {
    ...view,
    user: userEvent.setup(),
    history,
  };
};

describe('ResultItemTitle', () => {
  const defaultProps = {
    duration: 150000, // Using microseconds is more realistic for formatDuration
    durationPercent: 10,
    isInDiffCohort: true,
    linkTo: { pathname: '/search', search: `?traceID=trace-id-longer-than-8` }, // Use LocationDescriptor object
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
    // Test that the formatted duration is displayed correctly.
    expect(screen.getByText(formatDuration(defaultProps.duration))).toBeInTheDocument();

    // Test that the link is rendered with the correct href and contains the title.
    const link = screen.getByRole('link', { name: /150ms traceNameValue trace-i/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', `${defaultProps.linkTo.pathname}${defaultProps.linkTo.search}`);

    // Test that the checkbox is rendered and checked by default.
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();

    // Test that the duration bar is rendered with the correct width.
    const durationBar = container.querySelector('.ResultItemTitle--durationBar');
    expect(durationBar).toBeInTheDocument();
    expect(durationBar).toHaveStyle(`width: ${defaultProps.durationPercent}%`);
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
      const history = createMemoryHistory();
      jest.spyOn(history, 'push');
      const { user } = setup(defaultProps, history);

      // A user click on the checkbox should call the toggle function.
      await user.click(screen.getByRole('checkbox'));
      expect(defaultProps.toggleComparison).toHaveBeenCalledTimes(1);

      // Crucially, it should NOT trigger navigation by the parent Link.
      // We verify that the history object was not manipulated.
      expect(history.push).not.toHaveBeenCalled();

      // For comparison, confirm a direct click on the link *does* navigate.
      await user.click(screen.getByRole('link'));
      expect(history.push).toHaveBeenCalledWith(defaultProps.linkTo);
    });
  });

  describe('WrapperComponent', () => {
    it('renders <Link> when linkTo is provided', () => {
      const { rerender } = setup(defaultProps);
      // Assert the link is present and contains the expected text.
      expect(screen.getByRole('link', { name: /traceNameValue/i })).toBeInTheDocument();

      rerender(
        <MemoryRouter>
          <ResultItemTitle {...defaultProps} linkTo={null} />
        </MemoryRouter>
      );

      // Assert the link is now gone.
      expect(screen.queryByRole('link')).not.toBeInTheDocument();

      // Assert the title is still visible, but now inside a <div>, not an <a>.
      const titleElement = screen.getByText(/traceNameValue/i);
      const wrapper = titleElement.closest('.ResultItemTitle--item');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper.tagName).toBe('DIV');
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
      const { rerender, container } = setup(defaultProps);
      // Duration text is visible initially.
      expect(screen.getByText(formatDuration(defaultProps.duration))).toBeInTheDocument();

      rerender(
        <MemoryRouter>
          <ResultItemTitle {...defaultProps} duration={null} />
        </MemoryRouter>
      );
      // Duration text is now hidden.
      expect(screen.queryByText(formatDuration(defaultProps.duration))).not.toBeInTheDocument();

      // Verify the rest of the component structure remains intact.
      // The link, title, and trace ID should still be rendered.
      expect(screen.getByRole('link', { name: /traceNameValue/i })).toBeInTheDocument();
      expect(container.querySelector('.ResultItemTitle--idExcerpt')).toBeInTheDocument();
    });
  });
});
