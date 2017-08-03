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
import sinon from 'sinon';
import { shallow } from 'enzyme';

import TracePageHeader, { HEADER_ITEMS } from './TracePageHeader';
import traceGenerator from '../../demo/trace-generators';
import { getTraceName } from '../../selectors/trace';

const defaultProps = {
  trace: traceGenerator.trace({ numberOfSpans: 50 }),
};

const defaultOptions = {
  context: {
    textFilter: '',
    updateTextFilter: () => {},
  },
};

it('<TracePageHeader /> should render a <header />', () => {
  const wrapper = shallow(<TracePageHeader {...defaultProps} />, defaultOptions);

  expect(wrapper.find('header').length).toBe(1);
});

it('<TracePageHeader /> should render an empty <div /> if no trace present', () => {
  const wrapper = shallow(<TracePageHeader {...defaultProps} trace={null} />, defaultOptions);

  expect(wrapper.matchesElement(<div />)).toBeTruthy();
});

it('<TracePageHeader /> should render the trace title', () => {
  const wrapper = shallow(<TracePageHeader {...defaultProps} />, defaultOptions);
  const h2 = wrapper.find('h2').first();

  expect(h2.contains(getTraceName(defaultProps.trace))).toBeTruthy();
});

it('<TracePageHeader /> should render the header items', () => {
  const wrapper = shallow(<TracePageHeader {...defaultProps} />, defaultOptions);

  wrapper.find('.horizontal .item').forEach((item, idx) => {
    expect(item.contains(HEADER_ITEMS[idx].title)).toBeTruthy();
    expect(item.contains(HEADER_ITEMS[idx].renderer(defaultProps.trace))).toBeTruthy();
  });
});

it('<TracePageHeader /> should call the context filter method onChange of the input', () => {
  const updateTextFilter = sinon.spy();

  const wrapper = shallow(<TracePageHeader {...defaultProps} />, {
    ...defaultOptions,
    context: {
      ...defaultOptions.context,
      updateTextFilter,
    },
  });

  const event = { target: { value: 'my new value' } };

  wrapper.find('#trace-page__text-filter').first().prop('onChange')(event);

  expect(updateTextFilter.calledWith('my new value')).toBeTruthy();
});
