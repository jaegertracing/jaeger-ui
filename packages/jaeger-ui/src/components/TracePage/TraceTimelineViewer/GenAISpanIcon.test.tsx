// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render } from '@testing-library/react';

import { GenAISpanIcon } from './GenAISpanIcon';
import { IOtelSpan, SpanKind, StatusCode } from '../../../types/otel';

function makeSpan(attrs: Record<string, string> = {}): IOtelSpan {
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

describe('GenAISpanIcon', () => {
  it('renders nothing for a standard span', () => {
    const { container } = render(<GenAISpanIcon span={makeSpan({ 'http.method': 'GET' })} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders robot icon with "AI Agent" label for invoke_agent span', () => {
    const { getByLabelText } = render(
      <GenAISpanIcon span={makeSpan({ 'gen_ai.operation.name': 'invoke_agent' })} />
    );
    expect(getByLabelText('AI Agent')).toBeInTheDocument();
  });

  it('renders bolt icon with "LLM Call" label for chat span', () => {
    const { getByLabelText } = render(<GenAISpanIcon span={makeSpan({ 'gen_ai.operation.name': 'chat' })} />);
    expect(getByLabelText('LLM Call')).toBeInTheDocument();
  });

  it('renders wrench icon with "Tool Call" label for execute_tool span', () => {
    const { getByLabelText } = render(
      <GenAISpanIcon span={makeSpan({ 'gen_ai.operation.name': 'execute_tool' })} />
    );
    expect(getByLabelText('Tool Call')).toBeInTheDocument();
  });

  it('renders storage icon with "RAG Retrieval" label for retrieval span', () => {
    const { getByLabelText } = render(
      <GenAISpanIcon span={makeSpan({ 'gen_ai.operation.name': 'retrieval' })} />
    );
    expect(getByLabelText('RAG Retrieval')).toBeInTheDocument();
  });

  it('renders sparkle icon with "GenAI Span" label for unknown gen_ai span', () => {
    const { getByLabelText } = render(<GenAISpanIcon span={makeSpan({ 'gen_ai.provider.name': 'acme' })} />);
    expect(getByLabelText('GenAI Span')).toBeInTheDocument();
  });
});
