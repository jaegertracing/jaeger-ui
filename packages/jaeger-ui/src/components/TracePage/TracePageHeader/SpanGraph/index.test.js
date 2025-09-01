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

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SpanGraph from './index';
import CanvasSpanGraph from './CanvasSpanGraph';
import TickLabels from './TickLabels';
import ViewingLayer from './ViewingLayer';
import traceGenerator from '../../../../demo/trace-generators';
import transformTraceData from '../../../../model/transform-trace-data';
import * as canvasSpanGraphModule from './CanvasSpanGraph';

jest.mock('./CanvasSpanGraph', () => jest.fn(() => <div data-testid="CanvasSpanGraph" />));
jest.mock('./TickLabels', () => jest.fn(() => <div data-testid="TickLabels" />));
jest.mock('./ViewingLayer', () => jest.fn(() => <div data-testid="ViewingLayer" />));

describe('<SpanGraph>', () => {
  const trace = transformTraceData(traceGenerator.trace({}));
  const defaultProps = {
    trace,
    updateViewRangeTime: jest.fn(),
    updateNextViewRangeTime: jest.fn(),
    viewRange: {
      time: { current: [0, 1] },
    },
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders a <CanvasSpanGraph />', () => {
    render(<SpanGraph {...defaultProps} />);
    expect(screen.getByTestId('CanvasSpanGraph')).toBeInTheDocument();
  });

  it('renders a <TickLabels />', () => {
    render(<SpanGraph {...defaultProps} />);
    expect(screen.getByTestId('TickLabels')).toBeInTheDocument();
  });

  it('renders a <ViewingLayer />', () => {
    render(<SpanGraph {...defaultProps} />);
    expect(screen.getByTestId('ViewingLayer')).toBeInTheDocument();
  });

  it('returns a <div> if a trace is not provided', () => {
    const { container } = render(<SpanGraph {...defaultProps} trace={null} />);
    expect(container.querySelector('div')).toBeTruthy();
  });

  it('passes the same numTicks to TickLabels and ViewingLayer', () => {
    render(<SpanGraph {...defaultProps} />);
    const expectedTicks = 4;

    expect(TickLabels).toHaveBeenCalledWith(expect.objectContaining({ numTicks: expectedTicks }), {});
    expect(ViewingLayer).toHaveBeenCalledWith(expect.objectContaining({ numTicks: expectedTicks }), {});
  });

  it('passes correct items to CanvasSpanGraph', () => {
    render(<SpanGraph {...defaultProps} />);
    const expectedItems = trace.spans.map(span => ({
      valueOffset: span.relativeStartTime,
      valueWidth: span.duration,
      serviceName: span.process.serviceName,
    }));

    expect(CanvasSpanGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        valueWidth: trace.duration,
        items: expectedItems,
      }),
      {}
    );
  });

  it('uses memoization and does not regenerate items if props unchanged', () => {
    const { rerender } = render(<SpanGraph {...defaultProps} />);

    const firstCall = canvasSpanGraphModule.default.mock.calls[0];
    expect(firstCall).toBeDefined();
    const firstItems = firstCall[0].items;

    rerender(<SpanGraph {...defaultProps} />);

    const secondCall =
      canvasSpanGraphModule.default.mock.calls[canvasSpanGraphModule.default.mock.calls.length - 1];
    expect(secondCall).toBeDefined();
    const secondItems = secondCall[0].items;

    expect(secondItems).toBe(firstItems);
  });
});
