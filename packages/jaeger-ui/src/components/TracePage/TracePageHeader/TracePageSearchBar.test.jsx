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
  ['Search syntax', /in-page search/],
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

// The help button is always present; the navigation buttons are the ones a test counts.
const navButtons = () =>
  screen.queryAllByRole('button').filter(b => b.getAttribute('data-testid') !== 'search-help');

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
      const buttons = navButtons();
      expect(buttons).toHaveLength(3);

      buttons.forEach(button => {
        expect(button).toHaveClass('TracePageSearchBar--btn');
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

      expect(navButtons()).toHaveLength(0);
      expect(screen.getByRole('button', { name: 'Search syntax' })).toBeInTheDocument();
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
      const buttons = navButtons();
      expect(buttons).toHaveLength(3);

      buttons.forEach(button => {
        expect(button).toHaveClass('TracePageSearchBar--btn');
        expect(button).toBeDisabled();
      });
    });
  });
});

describe('the span filter cluster', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  it('shows the match count with text, including zero', () => {
    const { rerender } = render(<TracePageSearchBar {...defaultProps} resultCount={7} />);
    expect(screen.getByText('7')).toHaveClass('TracePageSearchBar--count');
    rerender(<TracePageSearchBar {...defaultProps} resultCount={0} />);
    expect(screen.getByText('0')).toHaveClass('TracePageSearchBar--count');
  });

  it('shows no count with an empty input and keeps the buttons disabled', () => {
    render(<TracePageSearchBar {...defaultProps} textFilter="" resultCount={0} />);
    expect(screen.queryByText('0')).toBeNull();
    expect(navButtons()).toHaveLength(3);
    navButtons().forEach(button => expect(button).toBeDisabled());
  });

  it('renders the funnel after the navigation buttons', () => {
    render(<TracePageSearchBar {...defaultProps} spanFilterNode={<span data-testid="funnel" />} />);
    const box = screen.getByTestId('funnel').closest('.TracePageSearchBar--filter');
    expect(box).not.toBeNull();
    expect(box.parentElement.lastElementChild).toBe(box);
    expect(box.previousElementSibling).toBe(screen.getByRole('button', { name: 'Next match' }));
  });

  it('offers the keep-or-hide menu only with text and a filterable view', async () => {
    const onConvertSearch = jest.fn();
    const { rerender } = render(
      <TracePageSearchBar
        {...defaultProps}
        textFilter=""
        onConvertSearch={onConvertSearch}
        spanFilterNode={<span />}
      />
    );
    expect(screen.queryByTestId('convert-search')).toBeNull();
    rerender(
      <TracePageSearchBar {...defaultProps} onConvertSearch={onConvertSearch} spanFilterNode={null} />
    );
    expect(screen.queryByTestId('convert-search')).toBeNull();
    rerender(
      <TracePageSearchBar {...defaultProps} onConvertSearch={onConvertSearch} spanFilterNode={<span />} />
    );
    fireEvent.click(screen.getByTestId('convert-search'));
    fireEvent.click(await screen.findByText('Hide matching spans'));
    expect(onConvertSearch).toHaveBeenCalledWith('hide');
  });

  it('disables the keep entry in remove mode and explains why', async () => {
    const onConvertSearch = jest.fn();
    render(
      <TracePageSearchBar
        {...defaultProps}
        onConvertSearch={onConvertSearch}
        spanFilterNode={<span />}
        keepDisabledReason="Keep filters need Lift to its parent"
      />
    );
    fireEvent.click(screen.getByTestId('convert-search'));
    const keep = await screen.findByText('Keep matching spans');
    expect(keep.closest('.ant-dropdown-menu-item')).toHaveClass('ant-dropdown-menu-item-disabled');
    fireEvent.click(keep);
    expect(onConvertSearch).not.toHaveBeenCalled();
    fireEvent.mouseOver(keep);
    await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent(/Lift to its parent/));
  });

  it('converts the text to a keep chip in lift mode', async () => {
    const onConvertSearch = jest.fn();
    render(
      <TracePageSearchBar {...defaultProps} onConvertSearch={onConvertSearch} spanFilterNode={<span />} />
    );
    fireEvent.click(screen.getByTestId('convert-search'));
    fireEvent.click(await screen.findByText('Keep matching spans'));
    expect(onConvertSearch).toHaveBeenCalledWith('keep');
  });

  it('disables the hide entry with its reason', async () => {
    const onConvertSearch = jest.fn();
    render(
      <TracePageSearchBar
        {...defaultProps}
        onConvertSearch={onConvertSearch}
        spanFilterNode={<span />}
        hideDisabledReason="This filter would leave no span shown"
      />
    );
    fireEvent.click(screen.getByTestId('convert-search'));
    const hide = await screen.findByText('Hide matching spans');
    expect(hide.closest('.ant-dropdown-menu-item')).toHaveClass('ant-dropdown-menu-item-disabled');
    fireEvent.click(hide);
    expect(onConvertSearch).not.toHaveBeenCalled();
    fireEvent.mouseOver(hide);
    await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent(/leave no span/));
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
