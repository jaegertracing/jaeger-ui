// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { IoChevronDown, IoChevronForward } from 'react-icons/io5';
import GenAIAttributeRenderer from './GenAIAttributeRenderer';
import { IAttribute } from '../../../../types/otel';

import './LazyAttributeSection.css';

type Props = {
  attribute: IAttribute;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function LazyAttributeSection({ attribute }: Props) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isDeferredLoaded, setIsDeferredLoaded] = React.useState(false);

  const valueLength = typeof attribute.value === 'string' ? attribute.value.length : 0;
  const isLarge = valueLength > 102400; // 100 KB threshold for async deferral

  React.useEffect(() => {
    if (isExpanded && !isDeferredLoaded) {
      if (isLarge) {
        // Yield to main thread for very large attributes
        const timeout = setTimeout(() => setIsDeferredLoaded(true), 50);
        return () => clearTimeout(timeout);
      }
      setIsDeferredLoaded(true);
    }
    return undefined;
  }, [isExpanded, isDeferredLoaded, isLarge]);

  return (
    <div className="LazyAttributeSection">
      <div
        className="LazyAttributeSection--header"
        role="switch"
        aria-checked={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <IoChevronDown className="u-align-icon" />
        ) : (
          <IoChevronForward className="u-align-icon" />
        )}
        <strong className="LazyAttributeSection--key">{attribute.key}</strong>
        <span className="LazyAttributeSection--sizeBadge">{formatSize(valueLength)}</span>
      </div>
      {isExpanded && (
        <div className="LazyAttributeSection--content">
          {isDeferredLoaded ? (
            <GenAIAttributeRenderer attribute={attribute} />
          ) : (
            <div className="LazyAttributeSection--loading">Parsing large payload...</div>
          )}
        </div>
      )}
    </div>
  );
}
