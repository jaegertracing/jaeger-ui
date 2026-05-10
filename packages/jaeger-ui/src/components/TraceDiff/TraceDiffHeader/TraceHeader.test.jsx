// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import TraceHeader, { Attrs, EmptyAttrs } from './TraceHeader';
import { fetchedState } from '../../../constants';

describe('TraceHeader', () => {
  const renderWithProps = (passedProps = {}) => {
    const originalProps = {
      duration: 700,
      error: { errorKey: 'errorValue' },
      traceID: 'trace-id',
      traceName: 'trace name',
    };

    const props = {
      ...originalProps,
      ...passedProps,
    };

    render(<TraceHeader {...props} />);
  };

  it('renders as expected', () => {
    renderWithProps();

    expect(screen.getAllByTestId('TraceDiffHeader--traceHeader').length).toBe(1);
  });

  it('renders populated Attrs component when props.state === fetchedState.DONE', () => {
    renderWithProps({
      startTime: 150,
      totalSpans: 50,
      state: fetchedState.DONE,
    });

    expect(screen.getByTestId('TraceDiffHeader--traceAttributes')).toBeInTheDocument();
    expect(screen.getByTestId('TraceDiffHeader--traceAttr--date')).toBeInTheDocument();
    expect(screen.getByTestId('TraceDiffHeader--traceAttr--duration')).toBeInTheDocument();
    expect(screen.getByTestId('TraceDiffHeader--traceAttr--spans')).toBeInTheDocument();

    expect(screen.queryByTestId('TraceDiffHeader--emptyTraceAttributes')).not.toBeInTheDocument();
  });

  it('renders populated EmptyAttrs component when props.state !== fetchedState.DONE', () => {
    renderWithProps({
      startTime: 150,
      totalSpans: 50,
      state: fetchedState.LOADING,
    });

    expect(screen.getByTestId('TraceDiffHeader--emptyTraceAttributes')).toBeInTheDocument();
    expect(screen.queryByTestId('TraceDiffHeader--traceAttributes')).not.toBeInTheDocument();
  });

  it('renders "Select a Trace..." when props.traceID is not provided', () => {
    renderWithProps({
      traceID: null,
    });

    expect(screen.getByText('Select a Trace...')).toBeInTheDocument();
  });

  describe('EmptyAttrs', () => {
    it('renders as expected', () => {
      render(<EmptyAttrs />);

      expect(screen.getByTestId('TraceDiffHeader--traceAttr--empty')).toBeInTheDocument();
    });
  });

  describe('Attrs', () => {
    it('renders as expected when provided props', () => {
      // Represents a minute in microseconds
      const ONE_MINUTE = 60 * 10 ** 6;

      render(<Attrs duration={700} startTime={ONE_MINUTE} totalSpans={50} />);

      // Test that the shown values are correctly formatted
      expect(screen.getByText('January 1, 1970, 12:01:00 am')).toBeInTheDocument();
      expect(screen.getByTestId('TraceDiffHeader--traceAttr--duration').textContent).toBe('700μs');
      expect(screen.getByTestId('TraceDiffHeader--traceAttr--spans').textContent).toBe('50');
    });

    it('Attrs renders as expected when missing props', () => {
      render(<Attrs />);

      // Test that the default values are correctly
      expect(screen.getByText('January 1, 1970, 12:00:00 am')).toBeInTheDocument();
      expect(screen.getByTestId('TraceDiffHeader--traceAttr--duration').textContent).toBe('0μs');
      expect(screen.getByTestId('TraceDiffHeader--traceAttr--spans').textContent).toBe('0');
    });
  });
});
