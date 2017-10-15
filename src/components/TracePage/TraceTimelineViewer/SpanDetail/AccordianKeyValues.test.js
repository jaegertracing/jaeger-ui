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

import AccordianKeyValues, { KeyValuesSummary } from './AccordianKeyValues';
import KeyValuesTable from './KeyValuesTable';

const tags = [{ key: 'span.kind', value: 'client' }, { key: 'omg', value: 'mos-def' }];

describe('<KeyValuesSummary>', () => {
  let wrapper;

  const props = { data: tags };

  beforeEach(() => {
    wrapper = shallow(<KeyValuesSummary {...props} />);
  });

  it('renders without exploding', () => {
    expect(wrapper).toBeDefined();
  });

  it('returns `null` when props.data is empty', () => {
    wrapper.setProps({ data: null });
    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it('generates a list from `data`', () => {
    expect(wrapper.find('li').length).toBe(tags.length);
  });

  it('renders the data as text', () => {
    const texts = wrapper.find('li').map(node => node.text());
    const expectedTexts = tags.map(tag => `${tag.key}=${tag.value}`);
    expect(texts).toEqual(expectedTexts);
  });
});

describe('<AccordianKeyValues>', () => {
  let wrapper;

  const props = {
    compact: false,
    data: tags,
    highContrast: false,
    isOpen: false,
    label: 'le-label',
    onToggle: jest.fn(),
  };

  beforeEach(() => {
    wrapper = shallow(<AccordianKeyValues {...props} />);
  });

  it('renders without exploding', () => {
    expect(wrapper).toBeDefined();
    expect(wrapper.find('.AccordianKeyValues').length).toBe(1);
  });

  it('renders the label', () => {
    const header = wrapper.find('.AccordianKeyValues--header strong');
    expect(header.length).toBe(1);
    expect(header.text()).toBe(`${props.label}:`);
  });

  it('renders the summary instead of the table when it is not expanded', () => {
    const summary = wrapper.find('.AccordianKeyValues--header').find(KeyValuesSummary);
    expect(summary.length).toBe(1);
    expect(summary.prop('data')).toBe(tags);
    expect(wrapper.find(KeyValuesTable).length).toBe(0);
  });

  it('renders the table instead of the summarywhen it is expanded', () => {
    wrapper.setProps({ isOpen: true });
    expect(wrapper.find(KeyValuesSummary).length).toBe(0);
    const table = wrapper.find(KeyValuesTable);
    expect(table.length).toBe(1);
    expect(table.prop('data')).toBe(tags);
  });
});
