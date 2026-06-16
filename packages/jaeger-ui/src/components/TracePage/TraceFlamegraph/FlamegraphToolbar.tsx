// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0
//
// Adapted from @pyroscope/flamegraph v0.35.6 (Apache-2.0)
// Copyright (c) 2020 Pyroscope, Inc.

// Toolbar with search input, reset button, and view mode toggle on the right.

import React from 'react';
import { Button, Input, Segmented, Space } from 'antd';
import { IoRefreshOutline } from 'react-icons/io5';
import { HiOutlineViewColumns } from 'react-icons/hi2';
import { BsTable, BsFire } from 'react-icons/bs';

export type ViewMode = 'table' | 'both' | 'flamegraph';

type Props = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onReset: () => void;
  isDirty: boolean;
};

const VIEW_OPTIONS = [
  {
    label: (
      <Space size={4}>
        <BsTable />
        Table
      </Space>
    ),
    value: 'table',
  },
  {
    label: (
      <Space size={4}>
        <HiOutlineViewColumns />
        Both
      </Space>
    ),
    value: 'both',
  },
  {
    label: (
      <Space size={4}>
        <BsFire />
        Flamegraph
      </Space>
    ),
    value: 'flamegraph',
  },
];

const FlamegraphToolbar = ({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  onReset,
  isDirty,
}: Props) => (
  <div className="Flamegraph-toolbar" role="toolbar">
    <Space size="middle">
      <Input
        placeholder="Search..."
        allowClear
        value={searchQuery}
        onChange={e => onSearchChange(e.target.value)}
        style={{ width: 200 }}
        size="small"
        data-testid="flamegraph-search"
      />
      <Button
        size="small"
        icon={<IoRefreshOutline />}
        disabled={!isDirty}
        onClick={onReset}
        data-testid="flamegraph-reset"
      >
        Reset View
      </Button>
    </Space>
    <div className="Flamegraph-toolbar--right">
      <Segmented
        options={VIEW_OPTIONS}
        value={viewMode}
        onChange={value => onViewModeChange(value as ViewMode)}
        size="small"
      />
    </div>
  </div>
);

export default FlamegraphToolbar;
