// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import * as React from 'react';

import './TimelineRow.css';

type TimelineRowProps = {
  children?: React.Node,
  className: string,
};

type TimelineRowCellProps = {
  children?: React.Node,
  className: string,
  width: number,
  style?: Object,
};

export default function TimelineRow(props: TimelineRowProps) {
  const { children, className, ...rest } = props;
  return (
    <div className={`flex-row ${className}`} {...rest}>
      {children}
    </div>
  );
}

TimelineRow.defaultProps = {
  className: '',
};

function TimelineRowCell(props: TimelineRowCellProps) {
  const { children, className, width, style, ...rest } = props;
  const widthPercent = `${width * 100}%`;
  const mergedStyle = { ...style, flexBasis: widthPercent, maxWidth: widthPercent };
  return (
    <div className={`relative ${className}`} style={mergedStyle} {...rest}>
      {children}
    </div>
  );
}

TimelineRowCell.defaultProps = { className: '' };

TimelineRow.Cell = TimelineRowCell;
