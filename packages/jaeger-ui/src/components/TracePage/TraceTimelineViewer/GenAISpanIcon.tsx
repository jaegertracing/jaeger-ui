// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { MdSmartToy, MdBolt, MdBuild, MdStorage, MdAutoAwesome } from 'react-icons/md';

import { classifySpan, GenAISpanKind } from '../../../utils/genai/detect';
import { IOtelSpan } from '../../../types/otel';

type IconComponent = React.ComponentType<{ size?: number; title?: string; 'aria-label'?: string }>;

const KIND_ICONS: Record<Exclude<GenAISpanKind, 'STANDARD'>, IconComponent> = {
  AGENT: MdSmartToy,
  LLM_CALL: MdBolt,
  TOOL_CALL: MdBuild,
  RETRIEVAL: MdStorage,
  UNKNOWN_GENAI: MdAutoAwesome,
};

const KIND_TITLES: Record<Exclude<GenAISpanKind, 'STANDARD'>, string> = {
  AGENT: 'AI Agent',
  LLM_CALL: 'LLM Call',
  TOOL_CALL: 'Tool Call',
  RETRIEVAL: 'RAG Retrieval',
  UNKNOWN_GENAI: 'GenAI Span',
};

type Props = {
  span: IOtelSpan;
  size?: number;
};

export function GenAISpanIcon({ span, size = 14 }: Props): React.ReactElement | null {
  const kind = classifySpan(span);
  if (kind === 'STANDARD') return null;
  const Icon = KIND_ICONS[kind];
  const title = KIND_TITLES[kind];
  return <Icon size={size} title={title} aria-label={title} />;
}
