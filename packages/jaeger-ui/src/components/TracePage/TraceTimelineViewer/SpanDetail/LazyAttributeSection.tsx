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

const DEFER_RENDER_THRESHOLD_BYTES = 100 * 1024; // 100 KB

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/**
 * LazyAttributeSection is a disclosure component for large attributes.
 * It gates the rendering of large GenAI payloads to prevent main-thread stalls.
 */
export default function LazyAttributeSection({ attribute }: Props) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isDeferredLoaded, setIsDeferredLoaded] = React.useState(false);

  // Reset state when the attribute changes to avoid state leakage
  React.useEffect(() => {
    setIsExpanded(false);
    setIsDeferredLoaded(false);
  }, [attribute.key, attribute.value]);

  const valueLength = typeof attribute.value === 'string' ? attribute.value.length : 0;
  const isVeryLarge = valueLength > DEFER_RENDER_THRESHOLD_BYTES;

  const onToggle = () => {
    const nextExpanded = !isExpanded;
    setIsExpanded(nextExpanded);

    if (nextExpanded && isVeryLarge && !isDeferredLoaded) {
      // Small delay to ensure the disclosure animation starts before heavy rendering
      const timeout = setTimeout(() => {
        setIsDeferredLoaded(true);
      }, 50);
      return () => clearTimeout(timeout);
    }
    return undefined;
  };

  return (
    <div className="LazyAttributeSection">
      <button
        type="button"
        className="LazyAttributeSection--header"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={`lazy-attr-content-${attribute.key}`}
      >
        {isExpanded ? (
          <IoChevronDown className="u-align-icon" />
        ) : (
          <IoChevronForward className="u-align-icon" />
        )}
        <strong className="LazyAttributeSection--key">{attribute.key}</strong>
        <span className="LazyAttributeSection--sizeBadge">{formatSize(valueLength)}</span>
      </button>

      {isExpanded && (
        <div className="LazyAttributeSection--content" id={`lazy-attr-content-${attribute.key}`}>
          {isVeryLarge && !isDeferredLoaded ? (
            <div className="LazyAttributeSection--loading">Parsing large payload...</div>
          ) : (
            <GenAIAttributeRenderer attribute={attribute} />
          )}
        </div>
      )}
    </div>
  );
}
