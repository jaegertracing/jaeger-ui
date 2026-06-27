// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

import './TimelineRow.css';

export default function TimelineRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`flex-row ${className || ''}`}>{children}</div>;
}

function TimelineRowCell({
  children,
  className,
  width,
  style = {},
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  width: number;
  style?: object;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const widthPercent = `${width * 100}%`;
  const mergedStyle = { ...style, flexBasis: widthPercent, maxWidth: widthPercent };
  const handleKeyDown = onClick
    ? (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
        }
      }
    : undefined;
  return (
    <div
      className={`ub-relative ${className || ''}`}
      style={mergedStyle}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}

TimelineRow.Cell = TimelineRowCell;
