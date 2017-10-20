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
import { mount } from 'enzyme';

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
    rpc: {
      viewStart: 0.25,
      viewEnd: 0.75,
      color: '#000',
    },
  };

  it('renders without exploding', () => {
    const wrapper = mount(<SpanBar {...props} />);
    expect(wrapper).toBeDefined();
    const { onMouseOver, onMouseOut } = wrapper.find('.SpanBar--wrapper').props();
    const labelElm = wrapper.find('.SpanBar--label');
    expect(labelElm.text()).toBe(shortLabel);
    onMouseOver();
    expect(labelElm.text()).toBe(longLabel);
    onMouseOut();
    expect(labelElm.text()).toBe(shortLabel);
  });
});
