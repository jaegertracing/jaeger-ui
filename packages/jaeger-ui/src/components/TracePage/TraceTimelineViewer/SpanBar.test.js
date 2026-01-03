// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import SpanBar from './SpanBar';

describe('<SpanBar>', () => {
  const shortLabel = 'omg-so-awesome';
  const longLabel = 'omg-awesome-long-label';

  const props = {
    longLabel,
    shortLabel,
    color: '#fff',
    hintSide: 'right',
    viewEnd: 1,
    viewStart: 0,
    getViewedBounds: s => {
      // Event entries
      if (s === 10) {
        return { start: 0.1, end: 0.1 };
      }
      if (s === 20) {
        return { start: 0.2, end: 0.2 };
      }
      return { error: 'error' };
    },
    rpc: {
      viewStart: 0.25,
      viewEnd: 0.75,
      color: '#000',
    },
    traceStartTime: 0,
    span: {
      spanId: 'test-span',
      traceId: 'test-trace',
      name: 'test-op',
      startTimeUnixMicro: 0n,
      durationMicros: 100n,
      attributes: [],
      resource: {
        serviceName: 'test-service',
        attributes: [],
      },
      warnings: null,
      events: [
        {
          timeUnixMicro: 10,
          attributes: [
            { key: 'message', value: 'oh the log message' },
            { key: 'something', value: 'else' },
          ],
        },
        {
          timeUnixMicro: 10,
          attributes: [
            { key: 'message', value: 'oh the second log message' },
            { key: 'something', value: 'different' },
          ],
        },
        {
          timeUnixMicro: 20,
          attributes: [
            { key: 'message', value: 'oh the next log message' },
            { key: 'more', value: 'stuff' },
          ],
        },
      ],
    },
  };

  it('renders without exploding', () => {
    render(<SpanBar {...props} />);
    const labelElm = screen.getByText(shortLabel);
    expect(labelElm).toBeInTheDocument();
    expect(screen.queryByText(longLabel)).toBeNull();
    fireEvent.mouseOver(labelElm);
    expect(screen.getByText(longLabel)).toBeInTheDocument();
    expect(screen.queryByText(shortLabel)).toBeNull();
    fireEvent.mouseOut(labelElm);
    expect(screen.getByText(shortLabel)).toBeInTheDocument();
    expect(screen.queryByText(longLabel)).toBeNull();
  });

  it('event markers count', () => {
    // 3 event entries, two grouped together with the same timestamp
    render(<SpanBar {...props} />);
    expect(screen.getAllByTestId('SpanBar--logMarker').length).toEqual(2);
  });

  it('Critical Path is rendered', () => {
    const newProps = {
      ...props,
      criticalPath: [
        {
          spanId: 'Test-SpanId',
          section_start: 10,
          section_end: 20,
        },
      ],
      getViewedBounds: () => ({ start: 0.1, end: 0.5 }),
    };
    const wrapper = render(<SpanBar {...newProps} />);
    expect(wrapper.getAllByTestId('SpanBar--criticalPath').length).toEqual(1);
  });

  it('Critical Path tooltip is visible on hover', () => {
    const newProps = {
      ...props,
      criticalPath: [
        {
          spanId: 'Test-SpanId',
          section_start: 10,
          section_end: 20,
        },
      ],
      getViewedBounds: () => ({ start: 0.1, end: 0.5 }),
    };
    render(<SpanBar {...newProps} />);

    const criticalPathEl = screen.getByTestId('SpanBar--criticalPath');
    fireEvent.mouseEnter(criticalPathEl);

    const criticalPathTooltip = screen.getByRole('tooltip');
    expect(criticalPathTooltip.textContent).toMatch(
      'A segment on the critical path of the overall trace/request/workflow.'
    );
  });
});
