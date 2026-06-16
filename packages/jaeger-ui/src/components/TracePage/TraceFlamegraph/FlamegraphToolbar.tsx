// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0
//
// Adapted from @pyroscope/flamegraph v0.35.6 (Apache-2.0)
// Copyright (c) 2020 Pyroscope, Inc.

// Toolbar with search, Head First/Tail First toggle, Collapse Nodes Above,
// Reset View, and view mode toggle (Table/Both/Flamegraph) on the right.

import React from 'react';
import { Button, Dropdown, Input, Segmented, Space } from 'antd';
import { IoRefreshOutline } from 'react-icons/io5';
import { HiOutlineViewColumns } from 'react-icons/hi2';
import { BsTable, BsFire } from 'react-icons/bs';
import { TbArrowMerge } from 'react-icons/tb';

export type ViewMode = 'table' | 'both' | 'flamegraph';

type Props = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onReset: () => void;
  isDirty: boolean;
  inverted: boolean;
  onInvertedChange: (inverted: boolean) => void;
  onCollapseAbove: () => void;
  showChart: boolean;
};

const VIEW_OPTIONS = [
  { label: <BsTable title="Table" />, value: 'table' },
  { label: <HiOutlineViewColumns title="Both" />, value: 'both' },
  { label: <BsFire title="Flamegraph" />, value: 'flamegraph' },
];

const FlamegraphToolbar = ({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  onReset,
  isDirty,
  inverted,
  onInvertedChange,
  onCollapseAbove,
  showChart,
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
      {showChart && (
        <Dropdown
          menu={{
            items: [
              { key: 'head', label: 'Head First' },
              { key: 'tail', label: 'Tail First' },
            ],
            selectedKeys: [inverted ? 'head' : 'tail'],
            onClick: ({ key }) => onInvertedChange(key === 'head'),
          }}
        >
          <Button size="small" data-testid="flamegraph-orientation">
            {inverted ? 'Head First' : 'Tail First'}
          </Button>
        </Dropdown>
      )}
      {showChart && (
        <Button
          size="small"
          icon={<TbArrowMerge />}
          onClick={onCollapseAbove}
          data-testid="flamegraph-collapse"
        >
          Collapse Nodes Above
        </Button>
      )}
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
