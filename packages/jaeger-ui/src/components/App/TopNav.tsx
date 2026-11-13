// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Button, Dropdown, Menu, MenuProps, Popover } from 'antd';
import { IoChevronDown, IoMenu } from 'react-icons/io5';
import _has from 'lodash/has';
import { Link } from 'react-router-dom';

import JaegerAskSearchInput, { JaegerAssistantToggle } from './JaegerAskSearchInput';
import { useJaegerAssistantConfigured } from '../../hooks/useJaegerAssistant';
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
import { useEmbeddedState } from '../../stores/embedded-store';

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

if (getConfig().backendCapabilities?.metricsStorage) {
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
  const assistantConfigured = useJaegerAssistantConfigured();
  const embedded = useEmbeddedState();
  // The page the "more" panel was opened on, so that navigating away closes it
  const [moreOpenOn, setMoreOpenOn] = React.useState<string | null>(null);
  // Forget that page once it is left, so that going back to it doesn't reopen the panel
  if (moreOpenOn !== null && moreOpenOn !== pathname) setMoreOpenOn(null);
  const moreOpen = moreOpenOn === pathname;

  const askItem = {
    label: assistantConfigured ? (
      <span className="TopNav--askArea">
        <JaegerAskSearchInput />
        <JaegerAssistantToggle />
      </span>
    ) : (
      <JaegerAskSearchInput />
    ),
    key: assistantConfigured ? 'JaegerAskArea' : 'TraceIDSearchInput',
  };
  const themeItems =
    config.themes?.enabled && !embedded?.theme
      ? [
          {
            label: <ThemeToggleButton />,
            key: 'ThemeToggleButton',
          },
        ]
      : [];

  const itemsGlobalRight: MenuProps['items'] = [
    askItem,
    ...menuItems.map((m: ConfigMenuItem | ConfigMenuGroup) => {
      if (isItem(m)) {
        return { label: getItem(m).label, key: getItem(m).key };
      }
      return { label: <CustomNavDropdown key={m.label} {...m} />, key: m.label };
    }),
    ...themeItems,
  ];

  // The same items for the "more" panel that replaces the right menu on narrow screens. A group
  // expands in place rather than opening a hover dropdown, which needs a mouse.
  const itemsMore: MenuProps['items'] = [
    { ...askItem, className: 'TopNav--moreAsk' },
    ...menuItems.map((m: ConfigMenuItem | ConfigMenuGroup) => {
      if (isItem(m)) {
        return { label: getItem(m).label, key: getItem(m).key };
      }
      return {
        label: m.label,
        key: m.label,
        children: m.items.map(item => ({ ...getItem(item), key: `${m.label}/${item.label}` })),
      };
    }),
    ...themeItems,
  ];

  return (
    <div className="TopNav">
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
        className="Menu--item Menu--item--left"
        mode="horizontal"
        selectable={false}
        selectedKeys={[pathname]}
      />
      <Menu
        theme="dark"
        items={itemsGlobalRight}
        className="Menu--item Menu--item--right"
        mode="horizontal"
        selectable={false}
        disabledOverflow
        selectedKeys={[pathname]}
      />
      <Popover
        arrow={false}
        classNames={{ root: 'TopNav--morePanel' }}
        content={<Menu theme="dark" items={itemsMore} mode="inline" selectable={false} />}
        onOpenChange={open => setMoreOpenOn(open ? pathname : null)}
        open={moreOpen}
        placement="bottomRight"
        trigger="click"
      >
        <Button
          aria-expanded={moreOpen}
          aria-label="More options"
          className="TopNav--more"
          icon={<IoMenu />}
          type="text"
        />
      </Popover>
    </div>
  );
}

TopNavImpl.CustomNavDropdown = CustomNavDropdown;

export default withRouteProps(TopNavImpl);
