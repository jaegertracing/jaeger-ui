// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0
//
// Adapted from @pyroscope/flamegraph v0.35.6 (Apache-2.0)
// Copyright (c) 2020 Pyroscope, Inc.

// Toolbar with search input, reset/collapse buttons, and view mode toggle.

import React from 'react';
import { Button, Input, Radio, Space } from 'antd';
import { IoRefreshOutline } from 'react-icons/io5';
import { BsTable, BsFire } from 'react-icons/bs';
import { TbArrowMerge, TbColumns2 } from 'react-icons/tb';

export type ViewMode = 'table' | 'both' | 'flamegraph';

type Props = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onReset: () => void;
  isDirty: boolean;
  chartZoomed: boolean;
  onCollapseAbove: () => void;
  showChart: boolean;
};

const FlamegraphToolbar = ({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  onReset,
  isDirty,
  chartZoomed,
  onCollapseAbove,
  showChart,
}: Props) => (
  <div className="Flamegraph-toolbar" role="toolbar">
    <Input
      placeholder="Search..."
      allowClear
      value={searchQuery}
      onChange={e => onSearchChange(e.target.value)}
      style={{ width: 200 }}
      size="small"
      data-testid="flamegraph-search"
    />
    <div className="Flamegraph-toolbar--right">
      <Space size="middle">
        <Button
          size="small"
          icon={<IoRefreshOutline />}
          disabled={!isDirty}
          onClick={onReset}
          data-testid="flamegraph-reset"
        >
          Reset View
        </Button>
        {showChart && (
          <Button
            size="small"
            icon={<TbArrowMerge />}
            disabled={!chartZoomed}
            onClick={onCollapseAbove}
            data-testid="flamegraph-collapse"
          >
            Collapse nodes above
          </Button>
        )}
        <Radio.Group
          size="small"
          value={viewMode}
          onChange={e => onViewModeChange(e.target.value as ViewMode)}
        >
          <Radio.Button value="table">
            <BsTable style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Table
          </Radio.Button>
          <Radio.Button value="both">
            <TbColumns2 style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Both
          </Radio.Button>
          <Radio.Button value="flamegraph">
            <BsFire style={{ marginRight: 4, verticalAlign: 'middle' }} />
            Flamegraph
          </Radio.Button>
        </Radio.Group>
      </Space>
    </div>
  </div>
);

export default FlamegraphToolbar;
