// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as markers from './TracePageSearchBar.markers';
import DefaultTracePageSearchBar, { TracePageSearchBarFn as TracePageSearchBar } from './TracePageSearchBar';

vi.mock('../index.track', async () => ({
  trackFilter: jest.fn(),
}));

vi.mock('../../common/UiFindInput', () => {
  return mockDefault(
    React.forwardRef(function MockUiFindInput({ inputProps, trackFindFunction }, ref) {
      return (
        <div data-testid="ui-find-input-wrapper">
          <input
            ref={ref}
            data-testid="ui-find-input"
            data-test={inputProps['data-test']}
            className={inputProps.className}
            name={inputProps.name}
            onChange={() => trackFindFunction && trackFindFunction()}
            placeholder="Search..."
          />
          {inputProps.suffix}
        </div>
      );
    })
  );
});

// Each navigation button's accessible name and the tooltip text it shows.
const TOOLTIP_CASES = [
  ['Focus on matches', /^Collapse the trace to the paths leading to the matching spans$/],
  ['Previous match', /^Previous match$/],
  ['Next match', /^Next match$/],
];

const defaultProps = {
  forwardedRef: React.createRef(),
  navigable: true,
  nextResult: jest.fn(),
  prevResult: jest.fn(),
  clearSearch: jest.fn(),
  focusUiFindMatches: jest.fn(),
  resultCount: 0,
  textFilter: 'something',
};

describe('<TracePageSearchBar>', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe('truthy textFilter', () => {
    beforeEach(() => {
      render(<TracePageSearchBar {...defaultProps} />);
    });

    it.each(TOOLTIP_CASES)('shows a tooltip on the %s button on hover', async (label, tooltip) => {
      fireEvent.mouseOver(screen.getByRole('button', { name: label }));
      await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent(tooltip));
    });

    it.each(TOOLTIP_CASES)('shows a tooltip on the %s button on keyboard focus', async (label, tooltip) => {
      fireEvent.focus(screen.getByRole('button', { name: label }));
      await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent(tooltip));
    });

    it('renders UiFindInput with correct props', () => {
      const uiFindInput = screen.getByTestId('ui-find-input');
      const suffixElement = screen.getByText(String(defaultProps.resultCount));

      expect(uiFindInput).toHaveAttribute('data-test', markers.IN_TRACE_SEARCH);
      expect(uiFindInput).toHaveClass('TracePageSearchBar--bar', 'ub-flex-auto');
      expect(uiFindInput).toHaveAttribute('name', 'search');
      expect(suffixElement).toBeInTheDocument();
      expect(suffixElement).toHaveClass('TracePageSearchBar--count');
      expect(suffixElement).toHaveTextContent(String(defaultProps.resultCount));
    });

    it('renders buttons', () => {
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);

      buttons.forEach(button => {
        expect(button).toHaveClass('TracePageSearchBar--btn');
        expect(button).not.toHaveClass('is-disabled');
        expect(button).not.toBeDisabled();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Previous match' }));
      expect(defaultProps.prevResult).toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Next match' }));
      expect(defaultProps.nextResult).toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Focus on matches' }));
      expect(defaultProps.focusUiFindMatches).toHaveBeenCalled();
    });

    it('hides navigation buttons when not navigable', () => {
      cleanup();
      render(<TracePageSearchBar {...defaultProps} navigable={false} />);

      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });
  });

  describe('falsy textFilter', () => {
    beforeEach(() => {
      render(<TracePageSearchBar {...defaultProps} textFilter="" />);
    });

    it('renders UiFindInput with correct props', () => {
      const uiFindInput = screen.getByTestId('ui-find-input');
      const suffixElement = screen.queryByText(String(defaultProps.resultCount));

      expect(uiFindInput).toBeInTheDocument();
      expect(suffixElement).not.toBeInTheDocument();
    });

    it('renders buttons', () => {
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);

      buttons.forEach(button => {
        expect(button).toHaveClass('TracePageSearchBar--btn');
        expect(button).toHaveClass('is-disabled');
        expect(button).toBeDisabled();
      });
    });
  });
});

describe('<DefaultTracePageSearchBar>', () => {
  const { forwardedRef: ref, ...propsWithoutRef } = defaultProps;

  afterEach(() => {
    cleanup();
  });

  it('forwardsRef correctly', () => {
    render(<DefaultTracePageSearchBar {...propsWithoutRef} ref={ref} />);
    expect(ref.current).not.toBeNull();

    const uiFindInput = screen.getByTestId('ui-find-input');
    expect(uiFindInput).toBeInTheDocument();
    expect(uiFindInput).toHaveAttribute('data-test', markers.IN_TRACE_SEARCH);
    expect(uiFindInput).toHaveClass('TracePageSearchBar--bar', 'ub-flex-auto');
    expect(uiFindInput).toHaveAttribute('name', 'search');
  });
});
