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
import { Dropdown, Menu, MenuProps } from 'antd';
import { IoChevronDown } from 'react-icons/io5';
import _has from 'lodash/has';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';

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

import './TopNav.css';
import withRouteProps from '../../utils/withRouteProps';

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

  return { label: url ? link : label, key: label, disabled: !url };
}

function CustomNavDropdown({ label, items }: ConfigMenuGroup) {
  const menuItems = items.map(getItem);
  return (
    <Dropdown menu={{ items: menuItems }} placement="bottomRight">
      <a className="Dropdown--icon-container">
        {label} <IoChevronDown className="Dropdown--icon" />
      </a>
    </Dropdown>
  );
}

function isItem(itemOrGroup: ConfigMenuItem | ConfigMenuGroup): itemOrGroup is ConfigMenuItem {
  return !_has(itemOrGroup, 'items');
}

const itemsGlobalLeft: MenuProps['items'] = [
  {
    label: (
      <Link to={prefixUrl('/')} style={{ fontSize: '14px', fontWeight: 500 }}>
        JAEGER UI
      </Link>
    ),
    key: 'JAEGER UI',
  },
];

export function TopNavImpl(props: Props) {
  const { config, router } = props;
  const { pathname } = router.location;
  const menuItems = Array.isArray(config.menu) ? config.menu : [];

  const itemsGlobalRight: MenuProps['items'] = [
    {
      label: <TraceIDSearchInput />,
      key: 'TraceIDSearchInput',
    },
    ...menuItems.map(m => {
      if (isItem(m)) {
        return { label: getItem(m).label, key: getItem(m).key };
      }
      return { label: <CustomNavDropdown key={m.label} {...m} />, key: m.label };
    }),
  ];

  return (
    <div>
      <Menu
        theme="dark"
        mode="horizontal"
        selectable={false}
        className="ub-right Menu--item"
        disabledOverflow
        selectedKeys={[pathname]}
        items={itemsGlobalRight}
      />
      <Menu
        theme="dark"
        items={itemsGlobalLeft?.concat(
          NAV_LINKS.map(({ matches, to, text }) => {
            const url = typeof to === 'string' ? to : to(props);
            const key = matches(pathname) ? pathname : url;
            return { key, label: <Link to={url}>{text}</Link> };
          })
        )}
        className="Menu--item"
        mode="horizontal"
        selectable={false}
        selectedKeys={[pathname]}
      />
    </div>
  );
}

TopNavImpl.CustomNavDropdown = CustomNavDropdown;

// export for tests
export function mapStateToProps(state: ReduxState) {
  return state;
}

export default connect(mapStateToProps)(withRouteProps(TopNavImpl));
