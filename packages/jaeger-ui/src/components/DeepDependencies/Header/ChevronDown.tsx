// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { IoChevronDown } from 'react-icons/io5';

import './ChevronDown.css';

type TProps = {
  className?: string;
  style?: React.CSSProperties;
};

function ChevronDown(props: TProps) {
  const { className, style } = props;
  const cls = `Ddg--Header--ChevronDown ${className || ''}`;
  return <IoChevronDown className={cls} style={style} />;
}

export default React.memo(ChevronDown);
