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
import { Link } from 'react-router-dom';

import TopNav from './TopNav';

describe('<TopNav>', () => {
  const labelGitHub = 'GitHub';
  const labelAbout = 'About Jaeger';
  const dropdownItems = [
    {
      label: 'Docs',
      url: 'http://jaeger.readthedocs.io/en/latest/',
    },
    {
      label: 'Twitter',
      url: 'https://twitter.com/JaegerTracing',
    },
  ];

  const defaultProps = {
    menuConfig: [
      {
        label: labelGitHub,
        url: 'https://github.com/uber/jaeger',
      },
      {
        label: labelAbout,
        items: dropdownItems,
      },
    ],
  };

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<TopNav {...defaultProps} />);
  });

  describe('renders the default menu options', () => {
    it('renders the "Jaeger UI" button', () => {
      const items = wrapper.find(Link).findWhere(link => /Jaeger UI/.test(link.text()));
      expect(items.length).toBe(1);
    });

    it('renders the "Search" button', () => {
      const items = wrapper.find(Link).findWhere(link => /Search/.test(link.text()));
      expect(items.length).toBe(1);
    });

    it('renders the "Dependencies" button', () => {
      const items = wrapper.find(Link).findWhere(link => /Dependencies/.test(link.text()));
      expect(items.length).toBe(1);
    });
  });

  describe('renders the custom menu', () => {
    it('renders the top-level item', () => {
      const item = wrapper.find(TopNav.CustomNavItem);
      expect(item.length).toBe(1);
      expect(item.prop('label')).toBe(labelGitHub);
    });

    describe('renders the nested menu items', () => {
      it('renders the <CustomNavDropdown> component', () => {
        const item = wrapper.find(TopNav.CustomNavDropdown);
        expect(item.length).toBe(1);
        expect(item.prop('label')).toBe(labelAbout);
        expect(item.prop('items')).toBe(dropdownItems);
      });

      it('the <CustomNavDropdown> renders the links', () => {
        const dropdown = shallow(<TopNav.CustomNavDropdown label={labelAbout} items={dropdownItems} />);
        const links = dropdown.find('a');
        expect(links.length).toBe(2);
        const linkTexts = links.map(node => node.text()).sort();
        const expectTexts = dropdownItems.map(item => item.label).sort();
        expect(expectTexts).toEqual(linkTexts);
      });
    });
  });
});
