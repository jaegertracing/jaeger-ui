// Copyright (c) 2019 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { SpanReference } from '../../../types/trace';
import { ILink } from '../../../types/otel';
import { getUrl } from '.';

type ReferenceLinkProps = {
  reference?: SpanReference;
  link?: ILink;
  children: React.ReactNode;
  className?: string;
  focusSpan: (spanID: string) => void;
  onClick?: () => void;
};

export default function ReferenceLink(props: ReferenceLinkProps) {
  const { reference, link, children, className, focusSpan, ...otherProps } = props;
  delete otherProps.onClick;

  // Handle ILink (OTEL model)
  if (link) {
    if (link.span) {
      return (
        <a role="button" onClick={() => focusSpan(link.spanId)} className={className} {...otherProps}>
          {children}
        </a>
      );
    }
    return (
      <a
        href={getUrl(link.traceId, link.spanId)}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        {...otherProps}
      >
        {children}
      </a>
    );
  }

  // Handle SpanReference (legacy model)
  if (reference) {
    if (reference.span) {
      return (
        <a role="button" onClick={() => focusSpan(reference.spanID)} className={className} {...otherProps}>
          {children}
        </a>
      );
    }
    return (
      <a
        href={getUrl(reference.traceID, reference.spanID)}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        {...otherProps}
      >
        {children}
      </a>
    );
  }

  return null;
}
