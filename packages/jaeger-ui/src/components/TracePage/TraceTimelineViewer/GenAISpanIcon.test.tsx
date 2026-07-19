// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GenAISpanIcon } from './GenAISpanIcon';
import type { IOtelSpan, GenAISpanKind } from '../../../types/otel';

function makeSpan(genAIKind?: GenAISpanKind): IOtelSpan {
  return { genAIKind } as unknown as IOtelSpan;
}

describe('GenAISpanIcon', () => {
  it('returns null for a span with no genAIKind', () => {
    const { container } = render(<GenAISpanIcon span={makeSpan(undefined)} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders an LLM call icon for genAIKind=LLM_CALL', () => {
    render(<GenAISpanIcon span={makeSpan('LLM_CALL')} />);
    expect(screen.getByRole('img', { name: 'LLM call' })).toBeInTheDocument();
  });

  it('renders a tool call icon for genAIKind=TOOL_CALL', () => {
    render(<GenAISpanIcon span={makeSpan('TOOL_CALL')} />);
    expect(screen.getByRole('img', { name: 'MCP Tool call' })).toBeInTheDocument();
  });

  it('renders an agent icon for genAIKind=AGENT', () => {
    render(<GenAISpanIcon span={makeSpan('AGENT')} />);
    expect(screen.getByRole('img', { name: 'AI Agent' })).toBeInTheDocument();
  });

  it('renders a retrieval icon for genAIKind=RETRIEVAL', () => {
    render(<GenAISpanIcon span={makeSpan('RETRIEVAL')} />);
    expect(screen.getByRole('img', { name: 'Retrieval' })).toBeInTheDocument();
  });

  it('renders a generic GenAI icon for genAIKind=UNKNOWN_GENAI', () => {
    render(<GenAISpanIcon span={makeSpan('UNKNOWN_GENAI')} />);
    expect(screen.getByRole('img', { name: 'GenAI span' })).toBeInTheDocument();
  });

  it('falls back to the generic GenAI icon for an unrecognized genAIKind', () => {
    render(<GenAISpanIcon span={makeSpan('FUTURE_KIND' as GenAISpanKind)} />);
    expect(screen.getByRole('img', { name: 'GenAI span' })).toBeInTheDocument();
  });

  it('shows a hover tooltip explaining what the icon means (#4217)', async () => {
    render(<GenAISpanIcon span={makeSpan('TOOL_CALL')} />);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByRole('img', { name: 'MCP Tool call' }));
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent('MCP Tool call');
    });
  });
});
