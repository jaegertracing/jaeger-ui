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
import { shallow } from 'enzyme';
import { Dropdown } from 'semantic-ui-react';

import SearchDropdownInput from './SearchDropdownInput';

function toItem(s) {
  return { text: s, value: s };
}

const MAX_RESULTS = 3;

describe('<SearchDropdownInput>', () => {
  let currentItems;
  let items;
  let props;
  let wrapper;

  beforeEach(() => {
    items = ['abc', 'bcd', 'cde', 'abc', 'bcd', 'cde', 'abc', 'bcd', 'cde', ...'0123456789'].map(toItem);
    currentItems = items.slice(0, MAX_RESULTS);
    props = {
      items,
      maxResults: MAX_RESULTS,
      input: { onChange: () => {}, value: null },
    };
    wrapper = shallow(<SearchDropdownInput {...props} />);
  });

  it('does not explode', () => {
    expect(wrapper).toBeDefined();
  });

  it('limits the items via `maxResults`', () => {
    const dropdown = wrapper.find(Dropdown);
    const { options } = dropdown.props();
    expect(options.length).toBe(MAX_RESULTS);
    expect(options).toEqual(currentItems);
  });

  it('adjusts the options when given new items', () => {
    items = items.slice().reverse();
    wrapper.setProps({ items });
    const dropdown = wrapper.find(Dropdown);
    const { options } = dropdown.props();
    expect(options).toEqual(items.slice(0, MAX_RESULTS));
  });

  it('filters items by the searchText', () => {
    const rx = /b/;
    const dropdown = wrapper.find(Dropdown);
    const { search } = dropdown.props();
    const filtered = search(null, rx.source);
    const spec = items.filter(item => rx.test(item.text)).slice(0, MAX_RESULTS);
    expect(filtered).toEqual(spec);
  });
});
