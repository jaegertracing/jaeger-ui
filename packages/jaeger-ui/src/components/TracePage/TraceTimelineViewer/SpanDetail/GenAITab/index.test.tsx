// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import GenAITab from '.';
import type { IAttribute, IOtelSpan } from '../../../../../types/otel';

function makeSpan(attributes: IAttribute[]): IOtelSpan {
  return { spanID: 'abc123', attributes } as unknown as IOtelSpan;
}

describe('GenAITab', () => {
  it('renders provider and model when present', () => {
    render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.provider.name', value: 'openai' },
          { key: 'gen_ai.response.model', value: 'gpt-4o' },
        ])}
      />
    );
    expect(screen.getByText('openai')).toBeInTheDocument();
    expect(screen.getByText('gpt-4o')).toBeInTheDocument();
  });

  it('renders token usage including cached and reasoning tokens', () => {
    render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.usage.input_tokens', value: 100 },
          { key: 'gen_ai.usage.output_tokens', value: 50 },
          { key: 'gen_ai.usage.cache_read.input_tokens', value: 80 },
          { key: 'gen_ai.usage.reasoning.output_tokens', value: 20 },
        ])}
      />
    );
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('renders a zero input token count, not treating it as missing', () => {
    render(<GenAITab span={makeSpan([{ key: 'gen_ai.usage.input_tokens', value: 0 }])} />);
    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders conversation messages with role labels, visible by default', () => {
    render(
      <GenAITab
        span={makeSpan([
          {
            key: 'gen_ai.input.messages',
            value: [{ role: 'user', content: 'What is the weather?' }],
          },
          {
            key: 'gen_ai.output.messages',
            value: [{ role: 'assistant', content: 'It is sunny.' }],
          },
        ])}
      />
    );
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('What is the weather?')).toBeInTheDocument();
    expect(screen.getByText('assistant')).toBeInTheDocument();
    expect(screen.getByText('It is sunny.')).toBeInTheDocument();
  });

  it('renders system instructions as a system-role message, visible by default', () => {
    render(
      <GenAITab
        span={makeSpan([
          {
            key: 'gen_ai.system_instructions',
            value: [{ type: 'text', content: 'You are a helpful assistant.' }],
          },
        ])}
      />
    );
    expect(screen.getByText('system')).toBeInTheDocument();
    expect(screen.getByText('You are a helpful assistant.')).toBeInTheDocument();
  });

  it('renders a tool call with arguments and result together', () => {
    render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.tool.name', value: 'get_weather' },
          { key: 'gen_ai.tool.call.arguments', value: { city: 'NYC' } },
          { key: 'gen_ai.tool.call.result', value: { tempF: 72 } },
        ])}
      />
    );
    expect(screen.getByText('Tool Call: get_weather')).toBeInTheDocument();
    expect(screen.getByText('Arguments')).toBeInTheDocument();
    expect(screen.getByText('Result')).toBeInTheDocument();
  });

  it('parses tool call arguments given as a JSON-encoded string into the interactive tree, not raw text', () => {
    const { container } = render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.tool.name', value: 'get_weather' },
          { key: 'gen_ai.tool.call.arguments', value: JSON.stringify({ city: 'NYC' }) },
        ])}
      />
    );
    expect(container.querySelector('.json-markup-key')?.textContent).toContain('city');
    expect(container.querySelector('.json-markup-string')?.textContent).toBe('"NYC"');
  });

  it('renders tool call arguments that fail to parse as JSON as plain text, not a crash', () => {
    render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.tool.name', value: 'get_weather' },
          { key: 'gen_ai.tool.call.arguments', value: 'not valid json' },
        ])}
      />
    );
    expect(screen.getByText('not valid json')).toBeInTheDocument();
  });

  it('shows an empty state when the span has no gen_ai attributes', () => {
    render(<GenAITab span={makeSpan([{ key: 'http.method', value: 'GET' }])} />);
    expect(screen.getByText('No GenAI-specific attributes found on this span.')).toBeInTheDocument();
  });

  it('shows unhandled gen_ai attributes in a collapsed accordion instead of the empty state', () => {
    render(<GenAITab span={makeSpan([{ key: 'gen_ai.operation.name', value: 'chat' }])} />);
    expect(
      screen.getByText((_, element) => element?.textContent === 'Other GenAI Attributes:')
    ).toBeInTheDocument();
    expect(screen.getByText('gen_ai.operation.name')).toBeInTheDocument();
    expect(screen.queryByText('No GenAI-specific attributes found on this span.')).not.toBeInTheDocument();
  });

  it('expands the Other GenAI Attributes accordion on click', () => {
    render(<GenAITab span={makeSpan([{ key: 'gen_ai.operation.name', value: 'chat' }])} />);
    const header = screen.getByText((_, element) => element?.textContent === 'Other GenAI Attributes:');
    fireEvent.click(header);
    expect(screen.getByText('chat')).toBeInTheDocument();
  });
});
