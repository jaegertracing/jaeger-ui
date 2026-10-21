// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { LuLoaderCircle } from 'react-icons/lu';

import './LoadingIndicator.css';

export default function LoadingIndicator({
  centered = false,
  vcentered,
  className = '',
  label,
  small = false,
  style,
  ...rest
}: {
  centered?: boolean;
  vcentered?: boolean;
  className?: string;
  /** Announced to screen readers as a live status; leave unset when the surrounding UI already conveys loading. */
  label?: string;
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

  const icon = <LuLoaderCircle aria-hidden="true" className={cls} {...rest} style={style} />;
  if (!label) return icon;

  return (
    <>
      {icon}
      <span role="status" className="LoadingIndicator--label">
        {label}
      </span>
    </>
  );
}
