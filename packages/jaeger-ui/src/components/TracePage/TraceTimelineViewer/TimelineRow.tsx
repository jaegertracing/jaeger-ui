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
  onClick = () => {},
}: {
  children: React.ReactNode;
  className?: string;
  width: number;
  style?: object;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const widthPercent = `${width * 100}%`;
  const mergedStyle = { ...style, flexBasis: widthPercent, maxWidth: widthPercent };
  return (
    <div className={`ub-relative ${className || ''}`} style={mergedStyle} onClick={onClick}>
      {children}
    </div>
  );
}

TimelineRow.Cell = TimelineRowCell;
