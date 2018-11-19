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
import { connect } from 'react-redux';
import { Link, withRouter } from 'react-router-dom';

import TraceIDSearchInput from './TraceIDSearchInput';
import * as dependencies from '../DependencyGraph/url';
import * as searchUrl from '../SearchTracePage/url';
import * as diffUrl from '../TraceDiff/url';
import { getConfigValue } from '../../utils/config/get-config';
import prefixUrl from '../../utils/prefix-url';

import type { ReduxState } from '../../types';
import type { ConfigMenuItem, ConfigMenuGroup } from '../../types/config';

type Props = ReduxState;

const NAV_LINKS = [
  {
    to: searchUrl.getUrl(),
    matches: searchUrl.matches,
    text: 'Search',
  },
  {
    to: (props: Props) => diffUrl.getUrl(props.traceDiff),
    matches: diffUrl.matches,
    text: 'Compare',
  },
];

if (getConfigValue('dependencies.menuEnabled')) {
  NAV_LINKS.push({
    to: dependencies.getUrl(),
    matches: dependencies.matches,
    text: 'Dependencies',
  });
}

function CustomNavDropdown({ label, items }: ConfigMenuGroup) {
  const menuItems = (
    <Menu>
      {items.map(i => {
        const item = ((i: any): ConfigMenuItem);
          return (
          <Menu.Item key={item.label}>
            {getItemLink(item)}
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

export function TopNavImpl(props: Props) {
  const { config, router } = props;
  const { pathname } = router.location;
  const menuItems = Array.isArray(config.menu) ? config.menu : [];
  return (
    <div>
      <Menu theme="dark" mode="horizontal" selectable={false} className="ub-right" selectedKeys={[pathname]}>
        {menuItems.map(m => {
          if (m.items != null) {
            const group = ((m: any): ConfigMenuGroup);
            return (
              <Menu.Item key={group.label}>
                <CustomNavDropdown key={group.label} {...group} />
              </Menu.Item>
            );
          }
          const item = ((m: any): ConfigMenuItem);
          return (
            <Menu.Item key={item.label}>
              {getItemLink(item)}
            </Menu.Item>
          );
        })}
      </Menu>
      <Menu theme="dark" mode="horizontal" selectable={false} selectedKeys={[pathname]}>
        <Menu.Item>
          <Link to={prefixUrl('/')}>Jaeger UI</Link>
        </Menu.Item>
        <Menu.Item>
          <TraceIDSearchInput />
        </Menu.Item>
        {NAV_LINKS.map(({ matches, to, text }) => {
          const url = typeof to === 'string' ? to : to(props);
          const key = matches(pathname) ? pathname : url;
          return (
            <Menu.Item key={key}>
              <Link to={url}>{text}</Link>
            </Menu.Item>
          );
        })}
      </Menu>
    </div>
  );
}

function getItemLink(item: ConfigMenuItem) {
  const target = item.openInSameTab ? "_self" : "_blank";
  return (
    <a href={item.url} target={target} rel="noopener noreferrer">
      {item.label}
    </a>
  );
}

TopNavImpl.defaultProps = {
  menuConfig: [],
};

TopNavImpl.CustomNavDropdown = CustomNavDropdown;

function mapStateToProps(state: Props) {
  return state;
}

export default withRouter(connect(mapStateToProps)(TopNavImpl));
