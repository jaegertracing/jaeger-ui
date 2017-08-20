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
import { shallow, mount } from 'enzyme';

import TracePageHeader, { HEADER_ITEMS } from './TracePageHeader';

describe('<TracePageHeader>', () => {
  const defaultProps = {
    traceID: 'some-trace-id',
    name: 'some-trace-name',

    // maxDepth: PropTypes.number, // eslint-disable-line react/no-unused-prop-types
    // numServices: PropTypes.number, // eslint-disable-line react/no-unused-prop-types
    // numSpans: PropTypes.number, // eslint-disable-line react/no-unused-prop-types
    // durationMs: PropTypes.number, // eslint-disable-line react/no-unused-prop-types
    // timestampMs: PropTypes.number, // eslint-disable-line react/no-unused-prop-types
    // slimView: PropTypes.bool,
    // onSlimViewClicked: PropTypes.func,
  };

  const defaultOptions = {
    context: {
      textFilter: '',
      updateTextFilter: () => {},
    },
  };

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<TracePageHeader {...defaultProps} />, defaultOptions);
  });

  it('renders a <header />', () => {
    expect(wrapper.find('header').length).toBe(1);
  });

  it('renders an empty <div> if no traceID is present', () => {
    wrapper = mount(<TracePageHeader {...defaultProps} traceID={null} />, defaultOptions);
    expect(wrapper.children().length).toBe(0);
  });

  it('renders the trace title', () => {
    const h2 = wrapper.find('h2').first();
    expect(h2.contains(defaultProps.name)).toBeTruthy();
  });

  it('renders the header items', () => {
    wrapper.find('.horizontal .item').forEach((item, i) => {
      expect(item.contains(HEADER_ITEMS[i].title)).toBeTruthy();
      expect(item.contains(HEADER_ITEMS[i].renderer(defaultProps.trace))).toBeTruthy();
    });
  });

  it('calls the context updateTextFilter() function for onChange of the input', () => {
    const updateTextFilter = sinon.spy();
    wrapper = shallow(<TracePageHeader {...defaultProps} />, {
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
});
