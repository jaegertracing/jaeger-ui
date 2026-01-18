// Copyright (c) 2019 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { ILink } from '../../../types/otel';
import { getUrl } from '.';

type ReferenceLinkProps = {
  link: ILink;
  children: React.ReactNode;
  className?: string;
  focusSpan: (spanID: string) => void;
  onClick?: () => void;
};

export default function ReferenceLink(props: ReferenceLinkProps) {
  const { link, children, className, focusSpan, ...otherProps } = props;
  delete otherProps.onClick;

  // link within the trace should have link.span defined
  const isSameTrace = link.span !== undefined;

  if (isSameTrace) {
    return (
      <a role="button" onClick={() => focusSpan(link.spanID)} className={className} {...otherProps}>
        {children}
      </a>
    );
  }

  return (
    <a
      href={getUrl(link.traceID, link.spanID)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      {...otherProps}
    >
      {children}
    </a>
  );
}
