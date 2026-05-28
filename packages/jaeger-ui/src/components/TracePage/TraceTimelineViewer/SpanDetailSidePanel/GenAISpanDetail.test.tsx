// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GenAISpanDetail from './GenAISpanDetail';
import type { IOtelSpan } from '../../../../types/otel';
import { SpanKind, StatusCode } from '../../../../types/otel';
import type { Microseconds } from '../../../../types/units';

const T0 = 0 as unknown as Microseconds;
const T1 = 1000 as unknown as Microseconds;

function makeSpan(attrs: Record<string, unknown>): IOtelSpan {
  return {
    traceID: 'trace-1',
    spanID: 'span-1',
    name: 'test-span',
    kind: SpanKind.INTERNAL,
    startTime: T0,
    endTime: T1,
    duration: T1,
    attributes: Object.entries(attrs).map(([key, value]) => ({ key, value: value as any })),
    events: [],
    links: [],
    inboundLinks: [],
    status: { code: StatusCode.UNSET },
    resource: { attributes: [], serviceName: 'svc' },
    instrumentationScope: { name: 'test' },
    depth: 0,
    hasChildren: false,
    childSpans: [],
    relativeStartTime: T0,
    parentSpanID: undefined,
    parentSpan: undefined,
    warnings: null,
  } as unknown as IOtelSpan;
}

describe('GenAISpanDetail — LLMDetail', () => {
  const span = makeSpan({
    'gen_ai.request.model': 'gpt-4o',
    'gen_ai.system': 'openai',
    'gen_ai.operation.name': 'chat',
    'gen_ai.usage.input_tokens': 100,
    'gen_ai.usage.output_tokens': 50,
    'gen_ai.prompt': 'What is the capital of France?',
    'gen_ai.completion': 'Paris.',
  });

  it('renders model name as title', () => {
    render(<GenAISpanDetail span={span} kind="llm" />);
    expect(screen.getByText('gpt-4o')).toBeInTheDocument();
  });

  it('renders system and operation metadata', () => {
    render(<GenAISpanDetail span={span} kind="llm" />);
    expect(screen.getByText('openai')).toBeInTheDocument();
    expect(screen.getByText('chat')).toBeInTheDocument();
  });

  it('renders token usage counts', () => {
    render(<GenAISpanDetail span={span} kind="llm" />);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('input')).toBeInTheDocument();
    expect(screen.getByText('output')).toBeInTheDocument();
  });

  it('renders prompt and completion text', () => {
    render(<GenAISpanDetail span={span} kind="llm" />);
    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
    expect(screen.getByText('Paris.')).toBeInTheDocument();
  });

  it('shows Show more button and expands when completion exceeds 4096 chars', () => {
    const longText = 'x'.repeat(5000);
    const longSpan = makeSpan({ 'gen_ai.completion': longText });
    render(<GenAISpanDetail span={longSpan} kind="llm" />);
    const btn = screen.getByRole('button', { name: /show more/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.queryByRole('button', { name: /show more/i })).not.toBeInTheDocument();
  });

  it('falls back to span.name when model attribute is absent', () => {
    const noModel = makeSpan({ 'gen_ai.system': 'openai' });
    render(<GenAISpanDetail span={noModel} kind="llm" />);
    expect(screen.getByText('test-span')).toBeInTheDocument();
  });
});

describe('GenAISpanDetail — ToolDetail', () => {
  const span = makeSpan({
    'gen_ai.tool.name': 'get_weather',
    'gen_ai.tool.call.id': 'call-abc123',
    'gen_ai.tool.input': '{"city": "Paris"}',
    'gen_ai.tool.output': '{"temp": 18, "unit": "C"}',
  });

  it('renders tool name as title', () => {
    render(<GenAISpanDetail span={span} kind="tool" />);
    expect(screen.getByText('get_weather')).toBeInTheDocument();
  });

  it('renders call id', () => {
    render(<GenAISpanDetail span={span} kind="tool" />);
    expect(screen.getByText(/call-abc123/)).toBeInTheDocument();
  });

  it('pretty-prints JSON input', () => {
    render(<GenAISpanDetail span={span} kind="tool" />);
    expect(screen.getByText(/"city"/)).toBeInTheDocument();
    expect(screen.getByText(/"Paris"/)).toBeInTheDocument();
  });

  it('pretty-prints JSON output', () => {
    render(<GenAISpanDetail span={span} kind="tool" />);
    expect(screen.getByText(/"temp"/)).toBeInTheDocument();
  });

  it('falls back to span.name when tool.name is absent', () => {
    const noName = makeSpan({ 'gen_ai.tool.input': '{}' });
    render(<GenAISpanDetail span={noName} kind="tool" />);
    expect(screen.getByText('test-span')).toBeInTheDocument();
  });
});

describe('GenAISpanDetail — RetrievalDetail', () => {
  const span = makeSpan({
    'db.collection.name': 'product_docs',
    'rag.query': 'return policy',
    'rag.results_count': 7,
  });

  it('renders collection name as title', () => {
    render(<GenAISpanDetail span={span} kind="retrieval" />);
    expect(screen.getByText('product_docs')).toBeInTheDocument();
  });

  it('renders query as metadata', () => {
    render(<GenAISpanDetail span={span} kind="retrieval" />);
    expect(screen.getByText('return policy')).toBeInTheDocument();
  });

  it('renders result count', () => {
    render(<GenAISpanDetail span={span} kind="retrieval" />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('falls back to span.name when collection name is absent', () => {
    const noCollection = makeSpan({ 'rag.query': 'test' });
    render(<GenAISpanDetail span={noCollection} kind="retrieval" />);
    expect(screen.getByText('test-span')).toBeInTheDocument();
  });
});

describe('GenAISpanDetail — AgentDetail', () => {
  const span = makeSpan({
    'agent.episode_id': 'ep-001',
    'agent.step': 3,
    'agent.reasoning_score': 0.87,
    'agent.custom_field': 'some-value',
  });

  it('renders episode_id as title', () => {
    render(<GenAISpanDetail span={span} kind="agent" />);
    expect(screen.getByText('ep-001')).toBeInTheDocument();
  });

  it('renders step number', () => {
    render(<GenAISpanDetail span={span} kind="agent" />);
    expect(screen.getByText(/step 3/)).toBeInTheDocument();
  });

  it('renders reasoning score as badge', () => {
    render(<GenAISpanDetail span={span} kind="agent" />);
    expect(screen.getByText('0.87')).toBeInTheDocument();
  });

  it('renders extra agent attributes in a table', () => {
    render(<GenAISpanDetail span={span} kind="agent" />);
    expect(screen.getByText('agent.custom_field')).toBeInTheDocument();
    expect(screen.getByText('some-value')).toBeInTheDocument();
  });

  it('falls back to span.name when episode_id is absent', () => {
    const noEpisode = makeSpan({ 'agent.step': 1 });
    render(<GenAISpanDetail span={noEpisode} kind="agent" />);
    expect(screen.getByText('test-span')).toBeInTheDocument();
  });
});

describe('GenAISpanDetail — media gating', () => {
  it('shows blocked button and disabled state for http:// image URL', () => {
    const span = makeSpan({ 'gen_ai.prompt': 'http://example.com/img.png' });
    render(<GenAISpanDetail span={span} kind="llm" />);
    const btn = screen.getByRole('button', { name: /blocked/i });
    expect(btn).toBeDisabled();
  });

  it('shows enabled load button for https:// image URL', () => {
    const span = makeSpan({ 'gen_ai.prompt': 'https://example.com/img.png' });
    render(<GenAISpanDetail span={span} kind="llm" />);
    const btn = screen.getByRole('button', { name: /load image/i });
    expect(btn).not.toBeDisabled();
  });

  it('renders <img> after clicking load for https:// image URL', () => {
    const span = makeSpan({ 'gen_ai.prompt': 'https://example.com/img.png' });
    render(<GenAISpanDetail span={span} kind="llm" />);
    fireEvent.click(screen.getByRole('button', { name: /load image/i }));
    expect(screen.getByRole('img', { name: 'span media' })).toBeInTheDocument();
  });

  it('renders <audio> after clicking load for https:// audio URL', () => {
    const span = makeSpan({ 'gen_ai.prompt': 'https://example.com/clip.mp3' });
    render(<GenAISpanDetail span={span} kind="llm" />);
    fireEvent.click(screen.getByRole('button', { name: /load audio/i }));
    const audio = document.querySelector('audio');
    expect(audio).not.toBeNull();
    expect(audio?.src).toContain('clip.mp3');
  });
});
