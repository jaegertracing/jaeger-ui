// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Dropdown, Menu, MenuProps } from 'antd';
import { IoChevronDown } from 'react-icons/io5';
import _has from 'lodash/has';
import { Link } from 'react-router-dom';

import TraceIDSearchInput from './TraceIDSearchInput';
import ThemeToggleButton from './ThemeToggleButton';
import Branding from './Branding';
import * as dependencyGraph from '../DependencyGraph/url';
import * as deepDependencies from '../DeepDependencies/url';
import * as qualityMetrics from '../QualityMetrics/url';
import * as searchUrl from '../SearchTracePage/url';
import * as diffUrl from '../TraceDiff/url';
import * as monitorATMUrl from '../Monitor/url';
import TTraceDiffState from '../../types/TTraceDiffState';
import { useTraceDiffStore } from '../../stores/trace-diff-store';
import { useShallow } from 'zustand/react/shallow';
import { ConfigMenuItem, ConfigMenuGroup } from '../../types/config';
import getConfig from '../../utils/config/get-config';
import { useConfig } from '../../hooks/useConfig';

import './TopNav.css';
import withRouteProps, { IWithRouteProps } from '../../utils/withRouteProps';

type Props = IWithRouteProps;
type PropsWithTraceDiff = Props & { traceDiff: TTraceDiffState };

const NAV_LINKS = [
  {
    to: searchUrl.getUrl(),
    matches: searchUrl.matches,
    text: 'Search',
  },
  {
    to: (props: PropsWithTraceDiff) => diffUrl.getUrl(props.traceDiff),
    matches: diffUrl.matches,
    text: 'Compare',
  },
];

if (getConfig().dependencies?.menuEnabled) {
  NAV_LINKS.push({
    to: dependencyGraph.getUrl(),
    matches: dependencyGraph.matches,
    text: 'System Architecture',
  });
}

if (getConfig().deepDependencies?.menuEnabled) {
  NAV_LINKS.push({
    to: deepDependencies.getUrl(),
    matches: deepDependencies.matches,
    text: 'Service Dependencies',
  });
}

if (getConfig().qualityMetrics?.menuEnabled) {
  NAV_LINKS.push({
    to: qualityMetrics.getUrl(),
    matches: qualityMetrics.matches,
    text: getConfig().qualityMetrics?.menuLabel ?? '',
  });
}

if (getConfig().storageCapabilities?.metricsStorage) {
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
    label: <Branding />,
    key: 'Branding',
  },
];

export function TopNavImpl(props: Props) {
  const { pathname } = props;
  const config = useConfig();
  const traceDiff = useTraceDiffStore(
    useShallow(s => ({
      a: s.a,
      b: s.b,
      cohort: s.cohort,
    }))
  );
  const propsWithDiff: PropsWithTraceDiff = { ...props, traceDiff };
  const menuItems = Array.isArray(config.menu) ? config.menu : [];

  const itemsGlobalRight: MenuProps['items'] = [
    {
      label: <TraceIDSearchInput />,
      key: 'TraceIDSearchInput',
    },
    ...menuItems.map((m: ConfigMenuItem | ConfigMenuGroup) => {
      if (isItem(m)) {
        return { label: getItem(m).label, key: getItem(m).key };
      }
      return { label: <CustomNavDropdown key={m.label} {...m} />, key: m.label };
    }),
    ...(config.themes?.enabled
      ? [
          {
            label: <ThemeToggleButton />,
            key: 'ThemeToggleButton',
          },
        ]
      : []),
  ];

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <Menu
        theme="dark"
        items={itemsGlobalLeft?.concat(
          NAV_LINKS.map(({ matches, to, text }) => {
            const url = typeof to === 'string' ? to : to(propsWithDiff);
            const key = matches(pathname) ? pathname : url;
            return {
              key,
              label: (
                <Link style={{ outline: 'revert' }} to={url}>
                  {text}
                </Link>
              ),
            };
          })
        )}
        className="Menu--item"
        mode="horizontal"
        selectable={false}
        selectedKeys={[pathname]}
        style={{ flex: '1 1 0', minWidth: '3rem' }}
      />
      <Menu
        theme="dark"
        items={itemsGlobalRight}
        className="Menu--item"
        mode="horizontal"
        selectable={false}
        disabledOverflow
        selectedKeys={[pathname]}
        style={{ flex: '0 1 auto', minWidth: 0 }}
      />
    </div>
  );
}

TopNavImpl.CustomNavDropdown = CustomNavDropdown;

export default withRouteProps(TopNavImpl);
