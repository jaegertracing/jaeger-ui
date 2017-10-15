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

import SpanDetailRow from './SpanDetailRow';
import SpanDetail from './SpanDetail';
import DetailState from './SpanDetail/DetailState';
import SpanTreeOffset from './SpanTreeOffset';

describe('<SpanDetailRow>', () => {
  const spanID = 'some-id';
  const props = {
    color: 'some-color',
    columnDivision: 0.5,
    detailState: new DetailState(),
    onDetailToggled: jest.fn(),
    isFilteredOut: false,
    logItemToggle: jest.fn(),
    logsToggle: jest.fn(),
    processToggle: jest.fn(),
    span: { spanID, depth: 3 },
    tagsToggle: jest.fn(),
    traceStartTime: 1000,
  };

  let wrapper;

  beforeEach(() => {
    props.onDetailToggled.mockReset();
    props.logItemToggle.mockReset();
    props.logsToggle.mockReset();
    props.processToggle.mockReset();
    props.tagsToggle.mockReset();
    wrapper = shallow(<SpanDetailRow {...props} />);
  });

  it('renders without exploding', () => {
    expect(wrapper).toBeDefined();
  });

  it('escalates toggle detail', () => {
    const calls = props.onDetailToggled.mock.calls;
    expect(calls.length).toBe(0);
    wrapper.find('.detail-row-expanded-accent').prop('onClick')();
    expect(calls).toEqual([[spanID]]);
  });

  it('renders the span tree offset', () => {
    const spanTreeOffset = <SpanTreeOffset level={props.span.depth + 1} />;
    expect(wrapper.contains(spanTreeOffset)).toBe(true);
  });

  it('renders the "expanded accent"', () => {
    const elm = <span className="detail-row-expanded-accent" style={{ borderColor: props.color }} />;
    expect(wrapper.containsMatchingElement(elm)).toBe(true);
  });

  it('renders the SpanDetail', () => {
    const spanDetail = (
      <SpanDetail
        detailState={props.detailState}
        logItemToggle={props.logItemToggle}
        logsToggle={props.logsToggle}
        processToggle={props.processToggle}
        span={props.span}
        tagsToggle={props.tagsToggle}
        traceStartTime={props.traceStartTime}
      />
    );
    expect(wrapper.contains(spanDetail)).toBe(true);
  });
});
