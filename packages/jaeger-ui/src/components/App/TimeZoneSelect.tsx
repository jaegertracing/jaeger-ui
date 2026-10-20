// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Button, Dropdown, MenuProps } from 'antd';
import { IoTimeOutline } from 'react-icons/io5';
import './TimeZoneSelect.css';

import { useTimeZone } from './TimeZoneProvider';
import { BROWSER_TIME_ZONE, formatTimeZoneOffset, UTC_TIME_ZONE } from '../../utils/date';

export default function TimeZoneSelect() {
  const { timeZone, setTimeZone } = useTimeZone();

  const items: MenuProps['items'] = [
    {
      key: BROWSER_TIME_ZONE,
      label: `Browser time (${Intl.DateTimeFormat().resolvedOptions().timeZone})`,
    },
    { key: UTC_TIME_ZONE, label: 'UTC' },
  ];

  return (
    <Dropdown
      menu={{
        items,
        selectable: true,
        selectedKeys: [timeZone],
        onClick: ({ key }) => setTimeZone(key === UTC_TIME_ZONE ? UTC_TIME_ZONE : BROWSER_TIME_ZONE),
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
