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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dropdown } from 'antd';
import { IoOpenOutline } from 'react-icons/io5';

import CopyIcon from '../../../common/CopyIcon';

import KeyValuesTable, { LinkValue } from './KeyValuesTable';

describe('LinkValue', () => {
  const title = 'titleValue';
  const href = 'hrefValue';
  const childrenText = 'childrenTextValue';
  const { container } = render(
    <LinkValue href={href} title={title} data-testid="linkvalue">
      {childrenText}
    </LinkValue>
  );

  it('renders as expected', () => {
    expect(wrapper.find('a').prop('href')).toBe(href);
    expect(wrapper.find('a').prop('title')).toBe(title);
    expect(wrapper.find('a').text()).toMatch(/childrenText/);
  });

  it('renders correct Icon', () => {
    expect(wrapper.find(IoOpenOutline).hasClass('KeyValueTable--linkIcon')).toBe(true);
  });
});

describe('<KeyValuesTable>', () => {
  let rendered;
  beforeEach(() => {
    rendered = render(<KeyValuesTable data={data} / data-testid="keyvaluestable">));
  });

  it('renders without exploding', () => {
    expect(wrapper).toBeDefined();
    expect(screen.getAllByTestId('.KeyValueTable')).toHaveLength(1);
  });

  it('renders a table row for each data element', () => {
    const trs = wrapper.find('tr');
    expect(trs.length).toBe(data.length);
    trs.forEach((tr, i) => {
      expect(tr.find('.KeyValueTable--keyColumn').text()).toMatch(data[i].key);
    });
  });

  it('renders the expected text for each span value', () => {
    const el = wrapper.find('.ub-inline-block');
    expect(el.length).toBe(data.length);
    el.forEach((valueDiv, i) => {
      if (data[i].expected) {
        expect(valueDiv.render().text()).toBe(data[i].expected);
      } else if (data[i].snapshot) {
        expect(valueDiv).toMatchSnapshot();
      }
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
    expect(anchor.closest('tr').find('td').first().text()).toBe('span.kind');
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
    const anchors = dropdown.prop('menu').items;
    expect(anchors).toHaveLength(2);
    const firstAnchor = anchors[0];
    expect(firstAnchor.label.props.href).toBe('http://example.com/1?kind=client');
    expect(firstAnchor.label.props.children).toBe('Example 1');
    const secondAnchor = anchors[anchors.length - 1];
    expect(secondAnchor.label.props.href).toBe('http://example.com/2?kind=client');
    expect(secondAnchor.label.props.children).toBe('Example 2');
    expect(dropdown.closest('tr').find('td').first().text()).toBe('span.kind');
  });

  it('renders a <CopyIcon / data-testid="copyicon"> with correct copyText for each data element', () => {
    const copyIcons = wrapper.find(CopyIcon);
    expect(copyIcons.length).toBe(2 * data.length); // Copy and Copy JSON buttons
    copyIcons.forEach((copyIcon, i) => {
      const datum = data[Math.floor(i / 2)];
      if (i % 2 === 0) {
        expect(copyIcon.prop('copyText')).toBe(datum.value);
        expect(copyIcon.prop('tooltipTitle')).toBe('Copy value');
      } else {
        expect(copyIcon.prop('copyText')).toBe(JSON.stringify(datum, null, 2));
        expect(copyIcon.prop('tooltipTitle')).toBe('Copy JSON');
      }
    });
  });
});
