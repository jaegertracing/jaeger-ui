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
    span: { spanID, depth: 3 },
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
    expect(receivedProps.logItemToggle).toBe(props.logItemToggle);
    expect(receivedProps.logsToggle).toBe(props.logsToggle);
    expect(receivedProps.processToggle).toBe(props.processToggle);
    expect(receivedProps.span).toBe(props.span);
    expect(receivedProps.tagsToggle).toBe(props.tagsToggle);
    expect(receivedProps.traceStartTime).toBe(props.traceStartTime);
  });

  it('adds span when calling linksGetter', () => {
    render(<SpanDetailRow {...props} />);
    expect(MockSpanDetail).toHaveBeenCalled();
    const receivedProps = MockSpanDetail.mock.calls[0][0];
    const linksGetter = receivedProps.linksGetter;
    const tags = [{ key: 'myKey', value: 'myValue' }];
    const linksGetterResponse = {};
    props.linksGetter.mockReturnValueOnce(linksGetterResponse);
    const result = linksGetter(tags, 0);
    expect(result).toBe(linksGetterResponse);
    expect(props.linksGetter).toHaveBeenCalledTimes(1);
    expect(props.linksGetter).toHaveBeenCalledWith(props.span, tags, 0);
  });
});
