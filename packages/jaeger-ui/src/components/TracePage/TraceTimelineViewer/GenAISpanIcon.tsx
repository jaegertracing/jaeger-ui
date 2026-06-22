// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import {
  IoHardwareChipOutline,
  IoFlashOutline,
  IoBuildOutline,
  IoServerOutline,
  IoStarOutline,
} from 'react-icons/io5';

import { classifySpan, type GenAISpanKind } from '../../../utils/genai/detect';
import { IOtelSpan } from '../../../types/otel';

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const KIND_ICON: Record<Exclude<GenAISpanKind, 'STANDARD'>, IconComponent> = {
  AGENT: IoHardwareChipOutline,
  LLM_CALL: IoFlashOutline,
  TOOL_CALL: IoBuildOutline,
  RETRIEVAL: IoServerOutline,
  UNKNOWN_GENAI: IoStarOutline,
};

const KIND_LABEL: Record<Exclude<GenAISpanKind, 'STANDARD'>, string> = {
  AGENT: 'AI agent',
  LLM_CALL: 'LLM call',
  TOOL_CALL: 'Tool call',
  RETRIEVAL: 'RAG retrieval',
  UNKNOWN_GENAI: 'GenAI span',
};

type Props = {
  span: IOtelSpan;
  className?: string;
};

export default function GenAISpanIcon({ span, className }: Props): React.ReactElement | null {
  const kind = classifySpan(span);
  if (kind === 'STANDARD') return null;
  const Icon = KIND_ICON[kind];
  return <Icon className={className} aria-label={KIND_LABEL[kind]} />;
}
