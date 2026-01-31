// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { LuLoaderCircle } from 'react-icons/lu';

import './LoadingIndicator.css';

export default function LoadingIndicator({
  centered = false,
  vcentered,
  className = '',
  small = false,
  style,
  ...rest
}: {
  centered?: boolean;
  vcentered?: boolean;
  className?: string;
  small?: boolean;
  style?: React.CSSProperties;
}) {
  const cls = `
    LoadingIndicator
    ${centered ? 'is-centered' : ''}
    ${vcentered ? 'is-vcentered' : ''}
    ${small ? 'is-small' : ''}
    ${className}
  `;

  return <LuLoaderCircle className={cls} {...rest} style={style} />;
}
