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
import _has from 'lodash/has';
import { connect } from 'react-redux';
import { RouteComponentProps, Link, withRouter } from 'react-router-dom';

import TraceIDSearchInput from './TraceIDSearchInput';
import * as dependencyGraph from '../DependencyGraph/url';
import * as deepDependencies from '../DeepDependencies/url';
import * as qualityMetrics from '../QualityMetrics/url';
import * as searchUrl from '../SearchTracePage/url';
import * as diffUrl from '../TraceDiff/url';
import * as monitorATMUrl from '../Monitor/url';
import { ReduxState } from '../../types';
import { ConfigMenuItem, ConfigMenuGroup } from '../../types/config';
import { getConfigValue } from '../../utils/config/get-config';
import prefixUrl from '../../utils/prefix-url';

type Props = RouteComponentProps<any> & ReduxState;

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
    to: dependencyGraph.getUrl(),
    matches: dependencyGraph.matches,
    text: 'System Architecture',
  });
}

if (getConfigValue('deepDependencies.menuEnabled')) {
  NAV_LINKS.push({
    to: deepDependencies.getUrl(),
    matches: deepDependencies.matches,
    text: 'Service Dependencies',
  });
}

if (getConfigValue('qualityMetrics.menuEnabled')) {
  NAV_LINKS.push({
    to: qualityMetrics.getUrl(),
    matches: qualityMetrics.matches,
    text: getConfigValue('qualityMetrics.menuLabel'),
  });
}

if (getConfigValue('monitor.menuEnabled')) {
  NAV_LINKS.push({
    to: monitorATMUrl.getUrl(),
    matches: monitorATMUrl.matches,
    text: 'Monitor',
  });
}

function getItem(item: ConfigMenuItem) {
  const { label, anchorTarget, url } = item;
  const link = (
    <a href={url} target={anchorTarget || '_blank'} rel="noopener noreferrer">
      {label}
    </a>
  );

  return (
    <Menu.Item key={label} disabled={!url}>
      {url ? link : label}
    </Menu.Item>
  );
}

function CustomNavDropdown({ label, items }: ConfigMenuGroup) {
  const menuItems = <Menu>{items.map(getItem)}</Menu>;
  return (
    <Dropdown overlay={menuItems} placement="bottomRight">
      <a>
        {label} <Icon type="down" />
      </a>
    </Dropdown>
  );
}

function isItem(itemOrGroup: ConfigMenuItem | ConfigMenuGroup): itemOrGroup is ConfigMenuItem {
  return !_has(itemOrGroup, 'items');
}

export function TopNavImpl(props: Props) {
  const { config, router } = props;
  const { pathname } = router.location;
  const menuItems = Array.isArray(config.menu) ? config.menu : [];

  return (
    <div>
      <Menu theme="dark" mode="horizontal" selectable={false} className="ub-right" selectedKeys={[pathname]}>
        <Menu.Item>
          <TraceIDSearchInput />
        </Menu.Item>
        {menuItems.map(m => {
          if (isItem(m)) {
            return getItem(m);
          }
          return (
            <Menu.Item key={m.label}>
              <CustomNavDropdown key={m.label} {...m} />
            </Menu.Item>
          );
        })}
      </Menu>
      <Menu theme="dark" mode="horizontal" selectable={false} selectedKeys={[pathname]}>
        <Menu.Item>
          <Link to={prefixUrl('/')} style={{ fontSize: '14px', fontWeight: 500 }}>
            JAEGER UI
          </Link>
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

TopNavImpl.CustomNavDropdown = CustomNavDropdown;

// export for tests
export function mapStateToProps(state: ReduxState) {
  return state;
}

export default withRouter(connect(mapStateToProps)(TopNavImpl));
