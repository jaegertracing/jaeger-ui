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
    expect(screen.getAllByTestId('TraceDiffHeader--traceAttr').length).toBe(3);
  });

  it('renders "Select a Trace..." when props.traceID is not provided ', () => {
    renderWithProps({
      traceID: null,
    });
    expect(screen.getByText('Select a Trace...'));
  });

  describe('EmptyAttrs', () => {
    it('renders as expected', () => {
      render(<EmptyAttrs />);
      expect(screen.getAllByTestId('TraceDiffHeader--traceAttr').length).toBe(1);
      expect(screen.getByTestId('TraceDiffHeader--traceAttr').textContent.trim()).toBe('');
    });
  });

  describe('Attrs', () => {
    it('renders as expected when provided props', () => {
      render(<Attrs duration={700} startTime={150} totalSpans={50} />);

      // Test that the shown values are correctly formatted
      expect(screen.getByText('January 1, 1970, 12:00:00 am'));
      expect(screen.getByTestId('TraceDiffHeader--traceAttr--duration').textContent).toBe('700μs');
      expect(screen.getByTestId('TraceDiffHeader--traceAttr--spans').textContent).toBe('50');
    });

    it('Attrs renders as expected when missing props', () => {
      render(<Attrs />);

      // Test that the default values are correctly
      expect(screen.getByText('January 1, 1970, 12:00:00 am'));
      expect(screen.getByTestId('TraceDiffHeader--traceAttr--duration').textContent).toBe('0μs');
      expect(screen.getByTestId('TraceDiffHeader--traceAttr--spans').textContent).toBe('0');
    });
  });
});
