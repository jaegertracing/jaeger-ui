// @flow

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
import { Link } from 'react-router-dom';
import { Dropdown, Menu } from 'semantic-ui-react';

import TraceIDSearchInput from './TraceIDSearchInput';
import type { ConfigMenuItem, ConfigMenuGroup } from '../../types/config';
import prefixUrl from '../../utils/prefix-url';

import './TopNav.css';

type TopNavProps = {
  menuConfig: (ConfigMenuItem | ConfigMenuGroup)[],
};

function CustomNavItem({ label, url }: ConfigMenuItem) {
  return (
    <a href={url} className="header item" target="_blank">
      {label}
    </a>
  );
}

function CustomNavDropdown({ label, items }: ConfigMenuGroup) {
  return (
    <Dropdown text={label} pointing className="link item">
      <Dropdown.Menu>
        {items.map(item => {
          const { label: itemLabel, url } = item;
          return (
            <Dropdown.Item key={itemLabel}>
              <a href={url} className="ui TopNav--DropdownItem" target="_blank">
                {itemLabel}
              </a>
            </Dropdown.Item>
          );
        })}
      </Dropdown.Menu>
    </Dropdown>
  );
}

const NAV_LINKS = [
  {
    key: 'dependencies',
    to: prefixUrl('/dependencies'),
    text: 'Dependencies',
  },
  {
    key: 'search',
    to: prefixUrl('/search'),
    text: 'Search',
  },
];

export default function TopNav(props: TopNavProps) {
  const { menuConfig } = props;
  const menuItems = Array.isArray(menuConfig) ? menuConfig : [];
  return (
    <Menu inverted className="TopNav">
      <Link to={prefixUrl('/')} className="header item">
        Jaeger UI
      </Link>
      <div className="ui input">
        <TraceIDSearchInput />
      </div>
      {NAV_LINKS.map(({ key, to, text }) =>
        <Link key={key} to={to} className="item">
          {text}
        </Link>
      )}
      <div className="right menu">
        {menuItems.map(item => {
          if (item.items) {
            return <CustomNavDropdown key={item.label} {...item} />;
          }
          return <CustomNavItem key={item.label} {...item} />;
        })}
      </div>
    </Menu>
  );
}

TopNav.defaultProps = {
  menuConfig: [],
};

// exported for tests
TopNav.CustomNavItem = CustomNavItem;
TopNav.CustomNavDropdown = CustomNavDropdown;
