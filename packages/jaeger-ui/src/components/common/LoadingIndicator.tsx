// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import cx from 'classnames';
import { LuLoaderCircle } from 'react-icons/lu';

import './LoadingIndicator.css';

export default function LoadingIndicator({
  centered = false,
  vcentered,
  className = '',
  small = false,
  message,
  style,
  ...rest
}: {
  centered?: boolean;
  vcentered?: boolean;
  className?: string;
  small?: boolean;
  message?: string;
  style?: React.CSSProperties;
}) {
  const commonCls = cx('LoadingIndicator', { 'is-small': small });
  const layoutCls = cx(className, {
    'is-centered': centered,
    'is-vcentered': vcentered,
  });

  if (message) {
    return (
      <div className={cx('LoadingIndicator--wrapper', layoutCls)}>
        <LuLoaderCircle className={commonCls} {...rest} style={style} />
        <span className='LoadingIndicator--message'>{message}</span>
      </div>
    );
  }

  return <LuLoaderCircle className={cx(commonCls, layoutCls)} {...rest} style={style} />;
}
