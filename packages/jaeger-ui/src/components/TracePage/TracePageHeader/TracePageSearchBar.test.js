// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as markers from './TracePageSearchBar.markers';
import DefaultTracePageSearchBar, { TracePageSearchBarFn as TracePageSearchBar } from './TracePageSearchBar';

jest.mock('../index.track', () => ({
  trackFilter: jest.fn(),
}));

jest.mock('../../common/UiFindInput', () => {
  return function MockUiFindInput({ inputProps, forwardedRef, trackFindFunction }) {
    return (
      <div data-testid="ui-find-input-wrapper">
        <input
          ref={forwardedRef}
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
  };
});

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
    let wrapper;

    beforeEach(() => {
      wrapper = render(<TracePageSearchBar {...defaultProps} />);
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
      expect(buttons).toHaveLength(4);

      buttons.forEach(button => {
        expect(button).toHaveClass('TracePageSearchBar--btn');
        expect(button).not.toHaveClass('is-disabled');
        expect(button).not.toBeDisabled();
      });

      const upButton = screen.getByTestId('UpOutlined');
      const downButton = screen.getByTestId('DownOutlined');
      const closeButton = screen.getByTestId('CloseOutlined');

      fireEvent.click(upButton);
      expect(defaultProps.prevResult).toHaveBeenCalled();

      fireEvent.click(downButton);
      expect(defaultProps.nextResult).toHaveBeenCalled();

      fireEvent.click(closeButton);
      expect(defaultProps.clearSearch).toHaveBeenCalled();
    });

    it('hides navigation buttons when not navigable', () => {
      cleanup();
      render(<TracePageSearchBar {...defaultProps} navigable={false} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(1);

      const closeButton = screen.getByTestId('CloseOutlined');
      expect(closeButton).toBeInTheDocument();
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
      expect(buttons).toHaveLength(4);

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
