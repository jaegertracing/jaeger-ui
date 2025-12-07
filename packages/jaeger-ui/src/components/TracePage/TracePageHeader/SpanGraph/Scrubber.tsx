// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import cx from 'classnames';

import './Scrubber.css';

type ScrubberProps = {
  isDragging: boolean;
  position: number;
  onMouseDown: React.MouseEventHandler<SVGGElement | HTMLDivElement>;
  onMouseEnter: React.MouseEventHandler<SVGGElement | HTMLDivElement>;
  onMouseLeave: React.MouseEventHandler<SVGGElement | HTMLDivElement>;
};

export default function Scrubber({
  isDragging,
  onMouseDown,
  onMouseEnter,
  onMouseLeave,
  position,
}: ScrubberProps) {
  const xPercent = `${position * 100}%`;
  const className = cx('Scrubber', { isDragging });
  return (
    <g className={className}>
      <g
        className="Scrubber--handles"
        data-testid="scrubber-handles"
        onMouseDown={onMouseDown}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* handleExpansion is only visible when `isDragging` is true */}
        <rect
          x={xPercent}
          className="Scrubber--handleExpansion"
          style={{ transform: `translate(-4.5px)` }}
          width="9"
          height="20"
        />
        <rect
          x={xPercent}
          className="Scrubber--handle"
          style={{ transform: `translate(-1.5px)` }}
          width="3"
          height="20"
        />
      </g>
      <line className="Scrubber--line" y2="100%" x1={xPercent} x2={xPercent} />
    </g>
  );
}
