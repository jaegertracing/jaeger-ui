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
  const props = {
    color: 'some-color',
    columnDivision: 0.5,
    detailState: new DetailState(),
    onDetailToggled: jest.fn(),
    linksGetter: jest.fn(),
    isFilteredOut: false,
    logItemToggle: jest.fn(),
    logsToggle: jest.fn(),
    processToggle: jest.fn(),
    span: {
      spanID,
      traceID: 'trace-id',
      processID: 'p1',
      operationName: 'op-name',
      startTime: 1000,
      duration: 100,
      depth: 3,
      relativeStartTime: 0,
      hasChildren: false,
      tags: [],
      logs: [],
      references: [],
      warnings: null,
      subsidiarilyReferencedBy: [],
      process: {
        serviceName: 'service',
        tags: [],
      },
    },
    tagsToggle: jest.fn(),
    traceStartTime: 1000,
  };

  beforeEach(() => {
    props.onDetailToggled.mockReset();
    props.linksGetter.mockReset();
    props.logItemToggle.mockReset();
    props.logsToggle.mockReset();
    props.processToggle.mockReset();
    props.tagsToggle.mockReset();
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
        span: props.span,
        showChildrenIcon: false,
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
    expect(receivedProps.logItemToggle).toEqual(expect.any(Function));
    expect(receivedProps.logsToggle).toBe(props.logsToggle);
    expect(receivedProps.processToggle).toBe(props.processToggle);
    // span is now converted to IOtelSpan via OtelSpanFacade
    expect(receivedProps.span).toHaveProperty('spanId', props.span.spanID);
    expect(receivedProps.span).toHaveProperty('name', props.span.operationName);
    expect(receivedProps.tagsToggle).toBe(props.tagsToggle);
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
    // linksGetter adapts IAttribute to KeyValuePair format
    expect(props.linksGetter).toHaveBeenCalledWith(props.span, [{ key: 'myKey', value: 'myValue' }], 0);
  });
});
