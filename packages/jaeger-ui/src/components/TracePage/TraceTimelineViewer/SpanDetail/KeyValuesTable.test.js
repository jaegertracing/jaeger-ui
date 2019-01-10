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
import { Dropdown } from 'antd';

import CopyIcon from '../../../common/copy-icon';

import KeyValuesTable, { LinkValue } from './KeyValuesTable';

describe('<KeyValuesTable>', () => {
  let wrapper;

  const data = [{ key: 'span.kind', value: 'client' }, { key: 'omg', value: 'mos-def' }];

  beforeEach(() => {
    wrapper = shallow(<KeyValuesTable data={data} />);
  });

  it('renders without exploding', () => {
    expect(wrapper).toBeDefined();
    expect(wrapper.find('.KeyValueTable').length).toBe(1);
  });

  it('renders a table row for each data element', () => {
    const trs = wrapper.find('tr');
    expect(trs.length).toBe(data.length);
    trs.forEach((tr, i) => {
      expect(tr.find('.KeyValueTable--keyColumn').text()).toMatch(data[i].key);
    });
  });

  it('renders a single link correctly', () => {
    wrapper.setProps({
      linksGetter: (array, i) =>
        array[i].key === 'span.kind'
          ? [
              {
                url: `http://example.com/?kind=${encodeURIComponent(array[i].value)}`,
                text: `More info about ${array[i].value}`,
              },
            ]
          : [],
    });

    const anchor = wrapper.find(LinkValue);
    expect(anchor).toHaveLength(1);
    expect(anchor.prop('href')).toBe('http://example.com/?kind=client');
    expect(anchor.prop('title')).toBe('More info about client');
    expect(
      anchor
        .closest('tr')
        .find('td')
        .first()
        .text()
    ).toBe('span.kind');
  });

  it('renders multiple links correctly', () => {
    wrapper.setProps({
      linksGetter: (array, i) =>
        array[i].key === 'span.kind'
          ? [
              { url: `http://example.com/1?kind=${encodeURIComponent(array[i].value)}`, text: 'Example 1' },
              { url: `http://example.com/2?kind=${encodeURIComponent(array[i].value)}`, text: 'Example 2' },
            ]
          : [],
    });
    const dropdown = wrapper.find(Dropdown);
    const menu = shallow(dropdown.prop('overlay'));
    const anchors = menu.find(LinkValue);
    expect(anchors).toHaveLength(2);
    const firstAnchor = anchors.first();
    expect(firstAnchor.prop('href')).toBe('http://example.com/1?kind=client');
    expect(firstAnchor.children().text()).toBe('Example 1');
    const secondAnchor = anchors.last();
    expect(secondAnchor.prop('href')).toBe('http://example.com/2?kind=client');
    expect(secondAnchor.children().text()).toBe('Example 2');
    expect(
      dropdown
        .closest('tr')
        .find('td')
        .first()
        .text()
    ).toBe('span.kind');
  });

  it('renders a <CopyIcon /> with correct copyText for each data element', () => {
    const copyIcons = wrapper.find(CopyIcon);
    expect(copyIcons.length).toBe(data.length);
    copyIcons.forEach((copyColumn, i) => {
      expect(copyColumn.prop('copyText')).toBe(JSON.stringify(data[i], null, 2));
      expect(copyColumn.prop('tooltipTitle')).toBe('Copy JSON');
    });
  });
});
