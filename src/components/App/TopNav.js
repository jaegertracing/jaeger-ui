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
import { Dropdown, Icon, Menu } from 'antd';
import _get from 'lodash/get';
import { Link } from 'react-router-dom';

import TraceIDSearchInput from './TraceIDSearchInput';
import type { ConfigMenuItem, ConfigMenuGroup } from '../../types/config';
import getConfig from '../../utils/config/get-config';
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
  const menuItems = (
    <Menu>
      {items.map(item => {
        const { label: itemLabel, url } = item;
        return (
          <Menu.Item key={itemLabel}>
            <a href={url} target="_blank" rel="noopener noreferrer">
              {itemLabel}
            </a>
          </Menu.Item>
        );
      })}
    </Menu>
  );
  return (
    <Dropdown overlay={menuItems} placement="bottomRight">
      <a>
        {label} <Icon type="down" />
      </a>
    </Dropdown>
  );
}

const NAV_LINKS = [
  {
    to: prefixUrl('/search'),
    key: 'search',
    text: 'Search',
  },
];

if (_get(getConfig(), 'dependencies.menuEnabled')) {
  NAV_LINKS.push({
    key: 'dependencies',
    to: prefixUrl('/dependencies'),
    text: 'Dependencies',
  });
}

export default function TopNav(props: TopNavProps) {
  const { menuConfig } = props;
  const menuItems = Array.isArray(menuConfig) ? menuConfig : [];
  return (
    <div>
      <style>
        {`
        .right { float: right; }
      `}
      </style>

      <Menu theme="dark" mode="horizontal" selectable={false} className="u-right">
        {menuItems.map(item => {
          if (item.items) {
            return (
              <Menu.Item key={item.label}>
                <CustomNavDropdown key={item.label} {...item} />
              </Menu.Item>
            );
          }
          return (
            <Menu.Item key="itemLabel">
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                {item.label}
              </a>
            </Menu.Item>
          );
        })}
      </Menu>
      <Menu theme="dark" mode="horizontal" selectable={false}>
        <Menu.Item>
          <Link to={prefixUrl('/')}>Jaeger UI</Link>
        </Menu.Item>
        <Menu.Item>
          <TraceIDSearchInput />
        </Menu.Item>
        {NAV_LINKS.map(({ key, to, text }) => (
          <Menu.Item key={key}>
            <Link to={to}>{text}</Link>
          </Menu.Item>
        ))}
      </Menu>
    </div>
  );
}

TopNav.defaultProps = {
  menuConfig: [],
};

// exported for tests
TopNav.CustomNavItem = CustomNavItem;
TopNav.CustomNavDropdown = CustomNavDropdown;
