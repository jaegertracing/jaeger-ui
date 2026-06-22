// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react-icons/io5', () => ({
  IoHardwareChipOutline: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-icon="hardware-chip" {...props} />
  ),
  IoFlashOutline: (props: React.SVGProps<SVGSVGElement>) => <svg data-icon="flash" {...props} />,
  IoBuildOutline: (props: React.SVGProps<SVGSVGElement>) => <svg data-icon="build" {...props} />,
  IoServerOutline: (props: React.SVGProps<SVGSVGElement>) => <svg data-icon="server" {...props} />,
  IoStarOutline: (props: React.SVGProps<SVGSVGElement>) => <svg data-icon="star" {...props} />,
}));

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

  it('renders IoHardwareChipOutline with aria-label "AI agent" for an invoke_agent span', () => {
    render(<GenAISpanIcon span={makeSpan({ 'gen_ai.operation.name': 'invoke_agent' })} />);
    const icon = screen.getByLabelText('AI agent');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-icon', 'hardware-chip');
  });

  it('renders IoFlashOutline with aria-label "LLM call" for a chat span', () => {
    render(<GenAISpanIcon span={makeSpan({ 'gen_ai.operation.name': 'chat' })} />);
    const icon = screen.getByLabelText('LLM call');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-icon', 'flash');
  });

  it('renders IoFlashOutline with aria-label "LLM call" for a text_completion span', () => {
    render(<GenAISpanIcon span={makeSpan({ 'gen_ai.operation.name': 'text_completion' })} />);
    const icon = screen.getByLabelText('LLM call');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-icon', 'flash');
  });

  it('renders IoBuildOutline with aria-label "Tool call" for an execute_tool span', () => {
    render(<GenAISpanIcon span={makeSpan({ 'gen_ai.operation.name': 'execute_tool' })} />);
    const icon = screen.getByLabelText('Tool call');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-icon', 'build');
  });

  it('renders IoServerOutline with aria-label "RAG retrieval" for a retrieval span', () => {
    render(<GenAISpanIcon span={makeSpan({ 'gen_ai.operation.name': 'retrieval' })} />);
    const icon = screen.getByLabelText('RAG retrieval');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-icon', 'server');
  });

  it('renders IoStarOutline with aria-label "GenAI span" for an unknown gen_ai operation', () => {
    render(<GenAISpanIcon span={makeSpan({ 'gen_ai.provider.name': 'openai' })} />);
    const icon = screen.getByLabelText('GenAI span');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('data-icon', 'star');
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
