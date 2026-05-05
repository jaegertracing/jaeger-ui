// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import GenAISpanIcon from './GenAISpanIcon';
import type { IOtelSpan } from '../../../types/otel';

function makeSpan(attrs: Record<string, string> = {}): IOtelSpan {
  return {
    attributes: Object.entries(attrs).map(([key, value]) => ({ key, value })),
  } as unknown as IOtelSpan;
}

describe('<GenAISpanIcon>', () => {
  it('returns null for a STANDARD span with no gen_ai.* attributes', () => {
    const { container } = render(<GenAISpanIcon span={makeSpan({ 'http.method': 'GET' })} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders an icon with aria-label "AI agent" for an invoke_agent span', () => {
    render(<GenAISpanIcon span={makeSpan({ 'gen_ai.operation.name': 'invoke_agent' })} />);
    expect(screen.getByLabelText('AI agent')).toBeInTheDocument();
  });

  it('renders an icon with aria-label "LLM call" for a chat span', () => {
    render(<GenAISpanIcon span={makeSpan({ 'gen_ai.operation.name': 'chat' })} />);
    expect(screen.getByLabelText('LLM call')).toBeInTheDocument();
  });

  it('renders an icon with aria-label "LLM call" for a text_completion span', () => {
    render(<GenAISpanIcon span={makeSpan({ 'gen_ai.operation.name': 'text_completion' })} />);
    expect(screen.getByLabelText('LLM call')).toBeInTheDocument();
  });

  it('renders an icon with aria-label "Tool call" for an execute_tool span', () => {
    render(<GenAISpanIcon span={makeSpan({ 'gen_ai.operation.name': 'execute_tool' })} />);
    expect(screen.getByLabelText('Tool call')).toBeInTheDocument();
  });

  it('renders an icon with aria-label "RAG retrieval" for a retrieval span', () => {
    render(<GenAISpanIcon span={makeSpan({ 'gen_ai.operation.name': 'retrieval' })} />);
    expect(screen.getByLabelText('RAG retrieval')).toBeInTheDocument();
  });

  it('renders an icon with aria-label "GenAI span" for an unknown gen_ai operation', () => {
    render(<GenAISpanIcon span={makeSpan({ 'gen_ai.provider.name': 'openai' })} />);
    expect(screen.getByLabelText('GenAI span')).toBeInTheDocument();
  });

  it('applies the className prop to the rendered icon', () => {
    render(
      <GenAISpanIcon
        span={makeSpan({ 'gen_ai.operation.name': 'chat' })}
        className="SpanBarRow--genAIIcon"
      />
    );
    expect(screen.getByLabelText('LLM call')).toHaveClass('SpanBarRow--genAIIcon');
  });
});
