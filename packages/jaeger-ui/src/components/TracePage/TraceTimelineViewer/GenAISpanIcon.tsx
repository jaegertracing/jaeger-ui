// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { MdSmartToy, MdBolt, MdBuild, MdStorage, MdAutoAwesome } from 'react-icons/md';
import { classifySpan, GenAISpanKind } from '../../../utils/genai/detect';
import { IOtelSpan } from '../../../types/otel';

type IconComponent = React.ComponentType<{ title?: string; 'aria-label'?: string }>;

const KIND_ICONS: Record<Exclude<GenAISpanKind, 'STANDARD'>, IconComponent> = {
  AGENT: MdSmartToy,
  LLM_CALL: MdBolt,
  TOOL_CALL: MdBuild,
  RETRIEVAL: MdStorage,
  UNKNOWN_GENAI: MdAutoAwesome,
};

const KIND_LABELS: Record<Exclude<GenAISpanKind, 'STANDARD'>, string> = {
  AGENT: 'Agent',
  LLM_CALL: 'LLM call',
  TOOL_CALL: 'Tool call',
  RETRIEVAL: 'Retrieval',
  UNKNOWN_GENAI: 'GenAI span',
};

export function GenAISpanIcon({ span }: { span: IOtelSpan }): React.ReactElement | null {
  const kind = classifySpan(span);
  if (kind === 'STANDARD') return null;
  const Icon = KIND_ICONS[kind];
  const label = KIND_LABELS[kind];
  return <Icon title={label} aria-label={label} />;
}
