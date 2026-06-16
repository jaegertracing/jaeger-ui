// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0
//
// Adapted from @pyroscope/flamegraph v0.35.6 (Apache-2.0)
// Copyright (c) 2020 Pyroscope, Inc.

// Toolbar with view mode toggle (Table/Both/Flamegraph), search input, and reset button.

import React from 'react';
import { Button, Input, Segmented, Space, Tooltip } from 'antd';
import { IoRefreshOutline } from 'react-icons/io5';

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
  { label: 'Table', value: 'table' },
  { label: 'Both', value: 'both' },
  { label: 'Flamegraph', value: 'flamegraph' },
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
      <Segmented
        options={VIEW_OPTIONS}
        value={viewMode}
        onChange={value => onViewModeChange(value as ViewMode)}
        size="small"
      />
      <Input
        placeholder="Search..."
        allowClear
        value={searchQuery}
        onChange={e => onSearchChange(e.target.value)}
        style={{ width: 200 }}
        size="small"
        data-testid="flamegraph-search"
      />
    </Space>
    <div className="Flamegraph-toolbar--right">
      <Tooltip title="Reset View">
        <Button
          size="small"
          icon={<IoRefreshOutline />}
          disabled={!isDirty}
          onClick={onReset}
          data-testid="flamegraph-reset"
        >
          Reset View
        </Button>
      </Tooltip>
    </div>
  </div>
);

export default FlamegraphToolbar;
