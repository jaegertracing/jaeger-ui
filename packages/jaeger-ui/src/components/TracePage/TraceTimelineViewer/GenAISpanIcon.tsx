// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { MdSmartToy, MdBolt, MdBuild, MdStorage, MdAutoAwesome } from 'react-icons/md';
import type { IconType } from 'react-icons';
import { classifySpan } from '../../../utils/genai/detect';
import type { IOtelSpan, GenAISpanKind } from '../../../types/otel';
import './GenAISpanIcon.css';

const KIND_ICONS: Record<GenAISpanKind, IconType> = {
  AGENT: MdSmartToy,
  LLM_CALL: MdBolt,
  TOOL_CALL: MdBuild,
  RETRIEVAL: MdStorage,
  UNKNOWN_GENAI: MdAutoAwesome,
};

const KIND_LABELS: Record<GenAISpanKind, string> = {
  AGENT: 'Agent',
  LLM_CALL: 'LLM call',
  TOOL_CALL: 'Tool call',
  RETRIEVAL: 'Retrieval',
  UNKNOWN_GENAI: 'GenAI span',
};

export function GenAISpanIcon({ span }: { span: IOtelSpan }): React.ReactElement | null {
  const kind = classifySpan(span);
  if (kind === undefined) return null;
  const Icon = KIND_ICONS[kind];
  const label = KIND_LABELS[kind];
  return (
    <span role="img" aria-label={label} className="GenAISpanIcon">
      <Icon aria-hidden="true" />
    </span>
  );
}
