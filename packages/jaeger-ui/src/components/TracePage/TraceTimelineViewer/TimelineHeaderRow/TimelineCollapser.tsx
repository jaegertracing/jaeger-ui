// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef } from 'react';
import { Tooltip } from 'antd';
import { LuChevronsRight } from 'react-icons/lu';
import { IoChevronForward } from 'react-icons/io5';

import './TimelineCollapser.css';

type CollapserProps = {
  onCollapseAll: () => void;
  onCollapseOne: () => void;
  onExpandOne: () => void;
  onExpandAll: () => void;
};

function getTitle(value: string) {
  return <span className="TimelineCollapser--tooltipTitle">{value}</span>;
}

export default function TimelineCollapser({
  onExpandAll,
  onExpandOne,
  onCollapseAll,
  onCollapseOne,
}: CollapserProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const getContainer = () => containerRef.current || document.body;

  return (
    <div className="TimelineCollapser" ref={containerRef}>
      <Tooltip title={getTitle('Expand +1')} getPopupContainer={getContainer}>
        <IoChevronForward
          onClick={onExpandOne}
          className="TimelineCollapser--btn-expand TimelineCollapser--btn-size TimelineCollapser--btn-down"
        />
      </Tooltip>
      <Tooltip title={getTitle('Collapse +1')} getPopupContainer={getContainer}>
        <IoChevronForward
          onClick={onCollapseOne}
          className="TimelineCollapser--btn TimelineCollapser--btn-size"
        />
      </Tooltip>
      <Tooltip title={getTitle('Expand All')} getPopupContainer={getContainer}>
        <LuChevronsRight
          onClick={onExpandAll}
          className="TimelineCollapser--btn-expand TimelineCollapser--btn-size TimelineCollapser--btn-down"
        />
      </Tooltip>
      <Tooltip title={getTitle('Collapse All')} getPopupContainer={getContainer}>
        <LuChevronsRight
          onClick={onCollapseAll}
          className="TimelineCollapser--btn TimelineCollapser--btn-size"
        />
      </Tooltip>
    </div>
  );
}
