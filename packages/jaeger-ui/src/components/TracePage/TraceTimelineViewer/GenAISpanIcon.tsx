// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Tooltip } from 'antd';
import type { IOtelSpan } from '../../../types/otel';
import { GEN_AI_KIND_META } from './spanDecorations';
import './GenAISpanIcon.css';

/** Renders the GenAI kind icon from the shared decoration registry. */
export function GenAISpanIcon({ span }: { span: IOtelSpan }): React.ReactElement | null {
  const kind = span.genAIKind;
  if (kind === undefined) return null;
  const { icon: Icon, label } = GEN_AI_KIND_META[kind] ?? GEN_AI_KIND_META.UNKNOWN_GENAI;
  return (
    <Tooltip title={label}>
      <span role="img" aria-label={label} className="GenAISpanIcon">
        <Icon aria-hidden="true" />
      </span>
    </Tooltip>
  );
}
