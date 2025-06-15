// Copyright (c) 2024 The Jaeger Authors.
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

import React, { useState } from 'react';
import { Tooltip } from 'antd';
import { formatDuration } from '../../../utils/date';
import { TimelineGap } from './utils';

import './TimelineGap.css';

interface TimelineGapProps {
  gap: TimelineGap;
  isCollapsed: boolean;
  onToggleCollapse: (gap: TimelineGap) => void;
  columnDivision: number;
  traceDuration: number;
}

function formatGapDuration(durationMicros: number): string {
  return formatDuration(durationMicros);
}

function toPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default function TimelineGapComponent({
  gap,
  isCollapsed,
  onToggleCollapse,
  columnDivision,
  traceDuration,
}: TimelineGapProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleToggle = () => {
    onToggleCollapse(gap);
  };

  const gapWidthPercent = isCollapsed ? gap.collapsedWidth : gap.duration / traceDuration;
  const gapStartPercent = gap.startTime / traceDuration;

  const tooltipContent = (
    <div className="TimelineGap--tooltip">
      <div>Gap Duration: {formatGapDuration(gap.duration)}</div>
      <div>From: {formatGapDuration(gap.precedingSpanEndTime)}</div>
      <div>To: {formatGapDuration(gap.followingSpanStartTime)}</div>
      {isCollapsed && <div>Click to expand</div>}
      {!isCollapsed && gap.shouldCollapse && <div>Click to collapse</div>}
    </div>
  );

  if (!gap.shouldCollapse && !isCollapsed) {
    // Don't render anything for gaps that shouldn't be collapsed and aren't collapsed
    return null;
  }

  return (
    <div className="TimelineGap--container">
      {/* Empty space for the name column */}
      <div 
        className="TimelineGap--nameColumn" 
        style={{ width: toPercent(columnDivision) }}
      />
      
      {/* Gap visualization in the timeline column */}
      <div 
        className="TimelineGap--timelineColumn" 
        style={{ width: toPercent(1 - columnDivision) }}
      >
        <Tooltip title={tooltipContent} placement="top">
          <div
            className={`TimelineGap--gap ${isCollapsed ? 'TimelineGap--collapsed' : 'TimelineGap--expanded'} ${
              isHovered ? 'TimelineGap--hovered' : ''
            }`}
            style={{
              left: toPercent(gapStartPercent),
              width: toPercent(gapWidthPercent),
            }}
            onClick={handleToggle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggle();
              }
            }}
          >
            {isCollapsed && (
              <>
                <div className="TimelineGap--collapsedIndicator">
                  <div className="TimelineGap--zigzag" />
                  <div className="TimelineGap--duration">
                    {formatGapDuration(gap.duration)}
                  </div>
                </div>
              </>
            )}
            {!isCollapsed && gap.shouldCollapse && (
              <div className="TimelineGap--expandedIndicator">
                <div className="TimelineGap--emptySpace">
                  <span className="TimelineGap--collapseHint">
                    Click to collapse {formatGapDuration(gap.duration)} gap
                  </span>
                </div>
              </div>
            )}
          </div>
        </Tooltip>
      </div>
    </div>
  );
}
