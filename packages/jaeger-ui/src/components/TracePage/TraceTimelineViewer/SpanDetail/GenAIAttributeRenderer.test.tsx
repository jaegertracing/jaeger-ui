// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import GenAIAttributeRenderer from './GenAIAttributeRenderer';
import type { IAttribute } from '../../../../types/otel';

function makeAttr(key: string, value: string): IAttribute {
  return { key, value };
}

describe('GenAIAttributeRenderer', () => {
  it('returns null for a non-rich-media gen_ai attribute', () => {
    const { container } = render(
      <GenAIAttributeRenderer attribute={makeAttr('gen_ai.operation.name', 'chat')} isOpen />
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null for a standard non-genai attribute', () => {
    const { container } = render(
      <GenAIAttributeRenderer attribute={makeAttr('http.method', 'GET')} isOpen />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when isOpen is false (lazy load)', () => {
    const { container } = render(
      <GenAIAttributeRenderer
        attribute={makeAttr('gen_ai.tool.call.arguments', '{"query":"test"}')}
        isOpen={false}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders JSON view for gen_ai.tool.call.arguments when open', () => {
    render(
      <GenAIAttributeRenderer
        attribute={makeAttr('gen_ai.tool.call.arguments', '{"query":"Paris"}')}
        isOpen
      />
    );
    expect(screen.getByText('gen_ai.tool.call.arguments')).toBeInTheDocument();
    expect(screen.getByRole('tree')).toBeInTheDocument();
  });

  it('renders JSON view for gen_ai.tool.call.result when open', () => {
    render(
      <GenAIAttributeRenderer attribute={makeAttr('gen_ai.tool.call.result', '{"answer":"Paris"}')} isOpen />
    );
    expect(screen.getByText('gen_ai.tool.call.result')).toBeInTheDocument();
    expect(screen.getByRole('tree')).toBeInTheDocument();
  });

  it('renders pre block for gen_ai.input.messages when open', () => {
    const messages = JSON.stringify([{ role: 'user', content: 'What is the capital of France?' }]);
    render(<GenAIAttributeRenderer attribute={makeAttr('gen_ai.input.messages', messages)} isOpen />);
    expect(screen.getByText('gen_ai.input.messages')).toBeInTheDocument();
    expect(screen.getByText(/What is the capital of France/)).toBeInTheDocument();
  });

  it('renders pre block for gen_ai.output.messages when open', () => {
    const messages = JSON.stringify([{ role: 'assistant', content: 'The capital is **Paris**.' }]);
    render(<GenAIAttributeRenderer attribute={makeAttr('gen_ai.output.messages', messages)} isOpen />);
    expect(screen.getByText(/The capital is/)).toBeInTheDocument();
  });

  it('falls back to raw string when JSON parse fails for a json-type key', () => {
    render(
      <GenAIAttributeRenderer attribute={makeAttr('gen_ai.tool.call.arguments', 'not-valid-json')} isOpen />
    );
    expect(screen.getByText('not-valid-json')).toBeInTheDocument();
  });

  it('renders JSON view for gen_ai.retrieval.documents when open', () => {
    const docs = JSON.stringify([{ title: 'Paris', snippet: 'Capital of France' }]);
    render(<GenAIAttributeRenderer attribute={makeAttr('gen_ai.retrieval.documents', docs)} isOpen />);
    expect(screen.getByText('gen_ai.retrieval.documents')).toBeInTheDocument();
    expect(screen.getByRole('tree')).toBeInTheDocument();
  });

  it('renders JSON view when attribute value is already a native object', () => {
    render(
      <GenAIAttributeRenderer
        attribute={{ key: 'gen_ai.tool.call.arguments', value: { query: 'Paris' } }}
        isOpen
      />
    );
    expect(screen.getByRole('tree')).toBeInTheDocument();
  });

  it('uses collapseAllNested for large JSON objects (more than 10 keys)', () => {
    const large = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`key${i}`, i]));
    render(
      <GenAIAttributeRenderer
        attribute={makeAttr('gen_ai.tool.call.arguments', JSON.stringify(large))}
        isOpen
      />
    );
    expect(screen.getByRole('tree')).toBeInTheDocument();
  });

  it('renders messages without a role without a leading blank line', () => {
    const messages = JSON.stringify([{ content: 'roleless message' }]);
    render(<GenAIAttributeRenderer attribute={makeAttr('gen_ai.input.messages', messages)} isOpen />);
    expect(screen.getByText('roleless message')).toBeInTheDocument();
  });

  it('handles array messages with non-object elements via String() fallback', () => {
    const messages = JSON.stringify(['plain string', 42]);
    render(<GenAIAttributeRenderer attribute={makeAttr('gen_ai.input.messages', messages)} isOpen />);
    expect(screen.getByText(/plain string/)).toBeInTheDocument();
  });

  it('renders JSON.stringify fallback when message value is a non-array object', () => {
    render(
      <GenAIAttributeRenderer
        attribute={{ key: 'gen_ai.output.messages', value: { role: 'assistant', content: 'hi' } }}
        isOpen
      />
    );
    expect(screen.getByText(/assistant/)).toBeInTheDocument();
  });
});
