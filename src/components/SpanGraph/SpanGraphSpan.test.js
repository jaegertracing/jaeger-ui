// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import React from 'react';
import { shallow } from 'enzyme';

import SpanGraphSpan, { MIN_SPAN_WIDTH } from './SpanGraphSpan';

const initialTimestamp = new Date().getTime() * 1000;
const defaultProps = {
  initialTimestamp,
  totalDuration: 4000000,
  rowHeight: 10,
  rowPadding: 1,
  index: 1,
  span: {
    spanID: 'span-id',
    startTime: initialTimestamp + 1000000,
    duration: 1000000,
    process: 'Test',
  },
};

it('<SpanGraphSpan /> should render a <rect>', () => {
  const wrapper = shallow(<SpanGraphSpan {...defaultProps} />);

  expect(wrapper.find('rect').length).toBe(1);
});

it('<SpanGraphSpan /> should use the spanID as the id', () => {
  const wrapper = shallow(<SpanGraphSpan {...defaultProps} />);
  const rect = wrapper.find('rect').first();

  expect(rect.prop('id')).toBe(defaultProps.span.spanID);
});

it('<SpanGraphSpan /> should have the height set to the rowHeight', () => {
  const wrapper = shallow(<SpanGraphSpan {...defaultProps} />);
  const rect = wrapper.find('rect').first();

  expect(rect.prop('height')).toBe(defaultProps.rowHeight);
});

it('<SpanGraphSpan /> should have the width based on the duration', () => {
  const wrapper = shallow(<SpanGraphSpan {...defaultProps} />);
  const rect = wrapper.find('rect').first();

  expect(rect.prop('width')).toBe('25%');
});

it('<SpanGraphSpan /> should enforce a max width', () => {
  const wrapper = shallow(
    <SpanGraphSpan
      {...defaultProps}
      span={{
        ...defaultProps.span,
        duration: 1,
      }}
    />
  );

  const rect = wrapper.find('rect').first();
  expect(rect.prop('width')).toBe(`${MIN_SPAN_WIDTH}%`);
});

it('<SpanGraphSpan /> should calculate the left offset for the timestamps', () => {
  let wrapper;
  let rect;

  wrapper = shallow(<SpanGraphSpan {...defaultProps} />);
  rect = wrapper.find('rect').first();
  expect(rect.prop('x')).toBe('25%');

  // (4 * (15 + 6)) + 6.
  wrapper = shallow(
    <SpanGraphSpan
      {...defaultProps}
      totalDuration={5000000}
      span={{
        ...defaultProps.span,
        startTime: initialTimestamp + 2500000,
      }}
    />
  );
  rect = wrapper.find('rect').first();
  expect(rect.prop('x')).toBe('50%');
});

it('<SpanGraphSpan /> should calculate the top offset for the index', () => {
  let wrapper;
  let rect;

  // (1 * (10 + 2)) + 2.
  wrapper = shallow(<SpanGraphSpan {...defaultProps} />);
  rect = wrapper.find('rect').first();
  expect(rect.prop('y')).toBe(14);

  // (4 * (15 + 6)) + 6.
  wrapper = shallow(
    <SpanGraphSpan {...defaultProps} index={4} rowHeight={15} rowPadding={3} />
  );
  rect = wrapper.find('rect').first();
  expect(rect.prop('y')).toBe(90);

  // (0 * (10 + 2)) + 2.
  wrapper = shallow(<SpanGraphSpan {...defaultProps} index={0} />);
  rect = wrapper.find('rect').first();
  expect(rect.prop('y')).toBe(2);
});

it('<SpanGraphSpan /> should decorate handlers with the span', () => {
  const event = {};

  function onClick(span, passedEvent) {
    expect(span).toEqual(defaultProps.span);
    expect(passedEvent).toEqual(event);
  }

  const wrapper = shallow(
    <SpanGraphSpan {...defaultProps} onClick={onClick} />
  );

  const rect = wrapper.find('rect').first();
  rect.props().onClick(event);
});

it('<SpanGraphSpan /> should spread unmatched props onto the rect', () => {
  const wrapper = shallow(<SpanGraphSpan {...defaultProps} stroke="red" />);

  const rect = wrapper.find('rect').first();
  expect(rect.prop('stroke')).toBe('red');
});
