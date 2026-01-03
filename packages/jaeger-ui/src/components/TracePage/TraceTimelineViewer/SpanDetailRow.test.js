// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

import SpanDetailRow from './SpanDetailRow';
import DetailState from './SpanDetail/DetailState';
import SpanTreeOffset from './SpanTreeOffset';

const MockSpanDetail = jest.fn(() => <div data-testid="mocked-span-detail" />);
jest.mock('./SpanDetail', () => ({
  __esModule: true,
  default: props => MockSpanDetail(props),
}));

const MockSpanTreeOffset = jest.fn(() => <div data-testid="mocked-span-tree-offset" />);
jest.mock('./SpanTreeOffset', () => ({
  __esModule: true,
  default: props => MockSpanTreeOffset(props),
}));

describe('<SpanDetailRow>', () => {
  const spanID = 'some-id';
  const span = {
    spanID: spanID,
    traceId: 'trace-id',
    name: 'op-name',
    startTimeUnixMicro: 1000n,
    durationMicros: 100n,
    attributes: [],
    events: [],
    resource: {
      serviceName: 'service',
      attributes: [],
    },
    warnings: null,
  };
  const props = {
    color: 'some-color',
    columnDivision: 0.5,
    detailState: new DetailState(),
    onDetailToggled: jest.fn(),
    linksGetter: jest.fn(),
    eventItemToggle: jest.fn(),
    eventsToggle: jest.fn(),
    resourceToggle: jest.fn(),
    linksToggle: jest.fn(),
    warningsToggle: jest.fn(),
    span,
    attributesToggle: jest.fn(),
    traceStartTime: 1000,
    focusSpan: jest.fn(),
    currentViewRangeTime: [0, 100],
    traceDuration: 1000,
    useOtelTerms: false,
  };

  beforeEach(() => {
    props.onDetailToggled.mockReset();
    props.linksGetter.mockReset();
    props.eventItemToggle.mockReset();
    props.eventsToggle.mockReset();
    props.resourceToggle.mockReset();
    props.linksToggle.mockReset();
    props.warningsToggle.mockReset();
    props.attributesToggle.mockReset();
    props.focusSpan.mockReset();
    MockSpanDetail.mockClear();
    MockSpanTreeOffset.mockClear();
  });

  it('renders without exploding', () => {
    render(<SpanDetailRow {...props} />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('calls onDetailToggled with the spanID when the switch is clicked', async () => {
    const user = userEvent.setup();
    render(<SpanDetailRow {...props} />);
    const toggleSwitch = screen.getByRole('switch');
    expect(props.onDetailToggled).not.toHaveBeenCalled();
    await user.click(toggleSwitch);
    expect(props.onDetailToggled).toHaveBeenCalledTimes(1);
    expect(props.onDetailToggled).toHaveBeenCalledWith(props.span.spanID);
  });

  it('renders the span tree offset', () => {
    render(<SpanDetailRow {...props} />);
    expect(MockSpanTreeOffset).toHaveBeenCalledTimes(1);
    expect(MockSpanTreeOffset).toHaveBeenCalledWith(
      expect.objectContaining({
        otelSpan: props.span,
      })
    );
  });

  it('renders the "expanded accent"', () => {
    render(<SpanDetailRow {...props} />);
    const accentSwitch = screen.getByRole('switch');
    expect(accentSwitch).toBeInTheDocument();
    expect(accentSwitch).toHaveClass('detail-row-expanded-accent');
    expect(accentSwitch).toHaveStyle(`border-color: ${props.color}`);
  });

  it('renders the SpanDetail', () => {
    render(<SpanDetailRow {...props} />);
    expect(screen.getByTestId('mocked-span-detail')).toBeInTheDocument();
    expect(MockSpanDetail).toHaveBeenCalledTimes(1);
    const receivedProps = MockSpanDetail.mock.calls[0][0];

    expect(receivedProps.detailState).toBe(props.detailState);
    expect(receivedProps.linksGetter).toEqual(expect.any(Function));
    expect(receivedProps.eventItemToggle).toEqual(expect.any(Function));
    expect(receivedProps.eventsToggle).toBe(props.eventsToggle);
    expect(receivedProps.resourceToggle).toBe(props.resourceToggle);
    // span is now converted to IOtelSpan via OtelSpanFacade
    expect(receivedProps.span).toHaveProperty('spanID', props.span.spanID);
    expect(receivedProps.span).toHaveProperty('name', props.span.name);
    expect(receivedProps.attributesToggle).toBe(props.attributesToggle);
    expect(receivedProps.traceStartTime).toBe(props.traceStartTime);
  });

  it('adds span when calling linksGetter', () => {
    render(<SpanDetailRow {...props} />);
    expect(MockSpanDetail).toHaveBeenCalled();
    const receivedProps = MockSpanDetail.mock.calls[0][0];
    const linksGetter = receivedProps.linksGetter;
    const attributes = [{ key: 'myKey', value: 'myValue' }];
    const linksGetterResponse = {};
    props.linksGetter.mockReturnValueOnce(linksGetterResponse);
    const result = linksGetter(attributes, 0);
    expect(result).toBe(linksGetterResponse);
    expect(props.linksGetter).toHaveBeenCalledTimes(1);
    // linksGetter is passed directly to SpanDetail (no adapter needed since props already have OTEL signature)
    expect(props.linksGetter).toHaveBeenCalledWith(attributes, 0);
  });
});
