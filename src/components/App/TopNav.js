// @flow

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
      {NAV_LINKS.map(({ key, to, text }) => (
        <Link key={key} to={to} className="item">
          {text}
        </Link>
      ))}
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
