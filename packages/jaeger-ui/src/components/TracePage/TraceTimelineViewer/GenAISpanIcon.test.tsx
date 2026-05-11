// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { GenAISpanIcon } from './GenAISpanIcon';
import type { IOtelSpan } from '../../../types/otel';

function makeSpan(attrs: { key: string; value: string }[]): IOtelSpan {
  return { attributes: attrs } as unknown as IOtelSpan;
}

describe('GenAISpanIcon', () => {
  it('returns null for a span with no gen_ai.* attributes', () => {
    const { container } = render(<GenAISpanIcon span={makeSpan([{ key: 'http.method', value: 'GET' }])} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders an LLM call icon for gen_ai.operation.name=chat', () => {
    render(<GenAISpanIcon span={makeSpan([{ key: 'gen_ai.operation.name', value: 'chat' }])} />);
    expect(screen.getByTitle('LLM call')).toBeInTheDocument();
  });

  it('renders a tool call icon for gen_ai.operation.name=execute_tool', () => {
    render(<GenAISpanIcon span={makeSpan([{ key: 'gen_ai.operation.name', value: 'execute_tool' }])} />);
    expect(screen.getByTitle('Tool call')).toBeInTheDocument();
  });

  it('renders an agent icon for gen_ai.operation.name=invoke_agent', () => {
    render(<GenAISpanIcon span={makeSpan([{ key: 'gen_ai.operation.name', value: 'invoke_agent' }])} />);
    expect(screen.getByTitle('Agent')).toBeInTheDocument();
  });

  it('renders a retrieval icon for gen_ai.operation.name=retrieval', () => {
    render(<GenAISpanIcon span={makeSpan([{ key: 'gen_ai.operation.name', value: 'retrieval' }])} />);
    expect(screen.getByTitle('Retrieval')).toBeInTheDocument();
  });

  it('renders a generic GenAI icon for unrecognized gen_ai.* attributes', () => {
    render(<GenAISpanIcon span={makeSpan([{ key: 'gen_ai.system', value: 'openai' }])} />);
    expect(screen.getByTitle('GenAI span')).toBeInTheDocument();
  });
});
