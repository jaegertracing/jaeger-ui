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

  const handleKeyDown = (e: React.KeyboardEvent<SVGElement>, handler: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handler();
    }
  };

  return (
    <div className="TimelineCollapser" ref={containerRef}>
      <Tooltip title={getTitle('Expand +1')} getPopupContainer={getContainer}>
        <IoChevronForward
          onClick={onExpandOne}
          role="button"
          tabIndex={0}
          aria-label="Expand +1"
          onKeyDown={e => handleKeyDown(e, onExpandOne)}
          className="TimelineCollapser--btn-expand TimelineCollapser--btn-size TimelineCollapser--btn-down"
        />
      </Tooltip>
      <Tooltip title={getTitle('Collapse +1')} getPopupContainer={getContainer}>
        <IoChevronForward
          onClick={onCollapseOne}
          role="button"
          tabIndex={0}
          aria-label="Collapse +1"
          onKeyDown={e => handleKeyDown(e, onCollapseOne)}
          className="TimelineCollapser--btn TimelineCollapser--btn-size"
        />
      </Tooltip>
      <Tooltip title={getTitle('Expand All')} getPopupContainer={getContainer}>
        <LuChevronsRight
          onClick={onExpandAll}
          role="button"
          tabIndex={0}
          aria-label="Expand All"
          onKeyDown={e => handleKeyDown(e, onExpandAll)}
          className="TimelineCollapser--btn-expand TimelineCollapser--btn-size TimelineCollapser--btn-down"
        />
      </Tooltip>
      <Tooltip title={getTitle('Collapse All')} getPopupContainer={getContainer}>
        <LuChevronsRight
          onClick={onCollapseAll}
          role="button"
          tabIndex={0}
          aria-label="Collapse All"
          onKeyDown={e => handleKeyDown(e, onCollapseAll)}
          className="TimelineCollapser--btn TimelineCollapser--btn-size"
        />
      </Tooltip>
    </div>
  );
}
