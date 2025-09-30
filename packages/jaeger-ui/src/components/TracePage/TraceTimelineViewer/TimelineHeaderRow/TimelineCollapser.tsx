// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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
