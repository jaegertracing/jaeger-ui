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
import sinon from 'sinon';
import { shallow } from 'enzyme';

import * as markers from './TracePageSearchBar.markers';
import TracePageSearchBar from './TracePageSearchBar';

describe('<TracePageSearchBar>', () => {
  const defaultProps = {
    updateTextFilter: () => {},
    textFilter: 'something',
    prevResult: () => {},
    nextResult: () => {},
    resultCount: 0,
  };

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<TracePageSearchBar {...defaultProps} />);
  });

  it('calls updateTextFilter() function for onChange of the input', () => {
    const updateTextFilter = sinon.spy();
    const props = { ...defaultProps, updateTextFilter };
    wrapper = shallow(<TracePageSearchBar {...props} />);
    const event = { target: { value: 'my new value' } };
    wrapper
      .find(`[data-test="${markers.IN_TRACE_SEARCH}"]`)
      .first()
      .simulate('change', event);
    expect(updateTextFilter.calledWith('my new value')).toBeTruthy();
  });

  it('renders the search bar', () => {
    expect(wrapper.find('Input').length).toBe(1);
  });

  it('renders the buttons', () => {
    expect(wrapper.find('Button').length).toBe(3);
  });
});
