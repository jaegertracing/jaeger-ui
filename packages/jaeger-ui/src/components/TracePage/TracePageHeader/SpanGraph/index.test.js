// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

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
  const trace = transformTraceData(traceGenerator.trace({})).asOtelTrace();
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

    const [tickLabelsProps] = TickLabels.mock.calls[0];
    const [viewingLayerProps] = ViewingLayer.mock.calls[0];
    expect(tickLabelsProps).toEqual(expect.objectContaining({ numTicks: expectedTicks }));
    expect(viewingLayerProps).toEqual(expect.objectContaining({ numTicks: expectedTicks }));
  });

  it('passes correct items to CanvasSpanGraph', () => {
    render(<SpanGraph {...defaultProps} />);
    const expectedItems = trace.spans.map(span => ({
      valueOffset: span.relativeStartTime,
      valueWidth: span.duration,
      serviceName: span.resource.serviceName,
    }));

    const [canvasProps] = CanvasSpanGraph.mock.calls[0];
    expect(canvasProps).toEqual(
      expect.objectContaining({
        valueWidth: trace.duration,
        items: expectedItems,
      })
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

  it('uses default height when height is not provided', () => {
    render(<SpanGraph {...defaultProps} />);
    const [viewingLayerProps] = ViewingLayer.mock.calls[0];
    expect(viewingLayerProps.height).toBe(60);
  });

  it('uses default height when height is falsy (0)', () => {
    render(<SpanGraph {...defaultProps} height={0} />);
    const [viewingLayerProps] = ViewingLayer.mock.calls[0];
    expect(viewingLayerProps.height).toBe(60);
  });

  it('uses provided height when valid', () => {
    render(<SpanGraph {...defaultProps} height={100} />);
    const [viewingLayerProps] = ViewingLayer.mock.calls[0];
    expect(viewingLayerProps.height).toBe(100);
  });
});
