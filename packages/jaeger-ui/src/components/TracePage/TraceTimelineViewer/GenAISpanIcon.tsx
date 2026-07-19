// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { Tooltip } from 'antd';
import { MdSmartToy, MdBuild, MdStorage, MdAutoAwesome } from 'react-icons/md';
import { RiGraduationCapFill } from 'react-icons/ri';
import type { IconType } from 'react-icons';
import type { IOtelSpan, GenAISpanKind } from '../../../types/otel';
import './GenAISpanIcon.css';

const KIND_META: Record<GenAISpanKind, { icon: IconType; label: string }> = {
  AGENT: { icon: MdSmartToy, label: 'AI Agent' },
  LLM_CALL: { icon: RiGraduationCapFill, label: 'LLM call' },
  TOOL_CALL: { icon: MdBuild, label: 'MCP Tool call' },
  RETRIEVAL: { icon: MdStorage, label: 'Retrieval' },
  UNKNOWN_GENAI: { icon: MdAutoAwesome, label: 'GenAI span' },
};

export function GenAISpanIcon({ span }: { span: IOtelSpan }): React.ReactElement | null {
  const kind = span.genAIKind;
  if (kind === undefined) return null;
  const { icon: Icon, label } = KIND_META[kind] ?? KIND_META.UNKNOWN_GENAI;
  return (
    <Tooltip title={label}>
      <span role="img" aria-label={label} className="GenAISpanIcon">
        <Icon aria-hidden="true" />
      </span>
    </Tooltip>
  );
}
