// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Button, Dropdown, MenuProps } from 'antd';
import { IoTimeOutline } from 'react-icons/io5';
import './TimeZoneSelect.css';

import { useTimeZone } from './TimeZoneProvider';
import { useConfig } from '../../hooks/useConfig';
import {
  BROWSER_TIME_ZONE,
  UTC_TIME_ZONE,
  formatTimeZoneOffset,
  getBrowserTimeZone,
  isValidTimeZone,
} from '../../utils/date';

function isNamedZone(zone: string | undefined): zone is string {
  const normalized = zone?.trim().toLowerCase();
  return Boolean(
    zone && normalized !== BROWSER_TIME_ZONE && normalized !== UTC_TIME_ZONE && isValidTimeZone(zone.trim())
  );
}

// Maps a setting to its menu key; unknown zones display as browser time.
function toMenuKey(zone: string | undefined): string {
  if (zone?.trim().toLowerCase() === UTC_TIME_ZONE) return UTC_TIME_ZONE;
  return isNamedZone(zone) ? zone.trim() : BROWSER_TIME_ZONE;
}

export default function TimeZoneSelect() {
  const { timeZone, setTimeZone } = useTimeZone();
  const configuredZone = useConfig().timeZone;

  const items: NonNullable<MenuProps['items']> = [
    { key: BROWSER_TIME_ZONE, label: `Browser time (${getBrowserTimeZone()})` },
    { key: UTC_TIME_ZONE, label: 'UTC' },
  ];
  // Offer the configured zone, and keep a previously chosen one selectable.
  const selectedKey = toMenuKey(timeZone);
  new Set([toMenuKey(configuredZone), selectedKey]).forEach(key => {
    if (key !== BROWSER_TIME_ZONE && key !== UTC_TIME_ZONE) {
      items.push({ key, label: key });
    }
  });

  return (
    <Dropdown
      menu={{
        items,
        selectable: true,
        selectedKeys: [selectedKey],
        onClick: ({ key }) => setTimeZone(key),
      }}
      placement="bottomRight"
      trigger={['click']}
    >
      <Button aria-label="Select time zone" className="TimeZoneSelect" type="text">
        <IoTimeOutline className="TimeZoneSelect--icon" />
        <span className="TimeZoneSelect--label">{formatTimeZoneOffset()}</span>
      </Button>
    </Dropdown>
  );
}
