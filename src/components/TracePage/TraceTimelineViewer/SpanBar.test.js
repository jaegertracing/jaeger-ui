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
