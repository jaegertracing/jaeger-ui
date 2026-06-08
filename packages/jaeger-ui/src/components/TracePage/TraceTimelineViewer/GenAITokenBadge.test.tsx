// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';

import { GenAITokenBadge } from './GenAITokenBadge';
import { IOtelSpan, SpanKind, StatusCode } from '../../../types/otel';

function makeSpan(attrs: Record<string, string | number> = {}): IOtelSpan {
  return {
    traceID: 'trace-1',
    spanID: 'span-1',
    name: 'test',
    kind: SpanKind.INTERNAL,
    startTime: 0 as IOtelSpan['startTime'],
    endTime: 1 as IOtelSpan['endTime'],
    duration: 1 as IOtelSpan['duration'],
    attributes: Object.entries(attrs).map(([key, value]) => ({ key, value })),
    events: [],
    links: [],
    inboundLinks: [],
    status: { code: StatusCode.OK },
    resource: { attributes: [], serviceName: 'svc' },
    instrumentationScope: { name: 'test' },
    depth: 0,
    hasChildren: false,
    childSpans: [],
    relativeStartTime: 0 as IOtelSpan['relativeStartTime'],
    warnings: null,
  };
}

describe('GenAITokenBadge', () => {
  it('returns null for a standard span', () => {
    const { container } = render(<GenAITokenBadge span={makeSpan({ 'http.method': 'GET' })} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null for a non-LLM GenAI span (tool call)', () => {
    const { container } = render(
      <GenAITokenBadge span={makeSpan({ 'gen_ai.operation.name': 'execute_tool' })} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null for an LLM span with no token attributes', () => {
    const { container } = render(<GenAITokenBadge span={makeSpan({ 'gen_ai.operation.name': 'chat' })} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders both input and output tokens', () => {
    render(
      <GenAITokenBadge
        span={makeSpan({
          'gen_ai.operation.name': 'chat',
          'gen_ai.usage.input_tokens': 512,
          'gen_ai.usage.output_tokens': 128,
        })}
      />
    );
    expect(screen.getByText('↑512 ↓128')).toBeInTheDocument();
  });

  it('renders only input tokens when output is absent', () => {
    render(
      <GenAITokenBadge
        span={makeSpan({ 'gen_ai.operation.name': 'chat', 'gen_ai.usage.input_tokens': 200 })}
      />
    );
    expect(screen.getByText('↑200')).toBeInTheDocument();
  });

  it('renders only output tokens when input is absent', () => {
    render(
      <GenAITokenBadge
        span={makeSpan({ 'gen_ai.operation.name': 'chat', 'gen_ai.usage.output_tokens': 75 })}
      />
    );
    expect(screen.getByText('↓75')).toBeInTheDocument();
  });

  it('formats counts >= 1000 as Xk', () => {
    render(
      <GenAITokenBadge
        span={makeSpan({
          'gen_ai.operation.name': 'chat',
          'gen_ai.usage.input_tokens': 1500,
          'gen_ai.usage.output_tokens': 2000,
        })}
      />
    );
    expect(screen.getByText('↑1.5k ↓2k')).toBeInTheDocument();
  });

  it('works for text_completion spans', () => {
    render(
      <GenAITokenBadge
        span={makeSpan({
          'gen_ai.operation.name': 'text_completion',
          'gen_ai.usage.input_tokens': 100,
          'gen_ai.usage.output_tokens': 50,
        })}
      />
    );
    expect(screen.getByText('↑100 ↓50')).toBeInTheDocument();
  });

  it('sets an accessible aria-label', () => {
    render(
      <GenAITokenBadge
        span={makeSpan({
          'gen_ai.operation.name': 'chat',
          'gen_ai.usage.input_tokens': 512,
          'gen_ai.usage.output_tokens': 128,
        })}
      />
    );
    expect(screen.getByLabelText('tokens: ↑512 ↓128')).toBeInTheDocument();
  });
});
