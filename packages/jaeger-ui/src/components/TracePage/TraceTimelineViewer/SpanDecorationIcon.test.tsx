// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { SpanDecorationIcon } from './SpanDecorationIcon';
import { getSpanDecorationIcon } from './spanDecorations';
import { makeAttributes } from '../../../model/attributes';
import type { GenAISpanKind } from '../../../types/otel';

describe('SpanDecorationIcon', () => {
  it('renders a labeled GenAI icon with tooltip', async () => {
    const decoration = getSpanDecorationIcon({ genAIKind: 'TOOL_CALL' })!;
    render(<SpanDecorationIcon decoration={decoration} />);
    expect(screen.getByRole('img', { name: 'MCP Tool call' })).toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByRole('img', { name: 'MCP Tool call' }));
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toHaveTextContent('MCP Tool call');
    });
  });

  it('falls back to the generic GenAI icon for an unrecognized kind', () => {
    const decoration = getSpanDecorationIcon({
      genAIKind: 'FUTURE_KIND' as GenAISpanKind,
    })!;
    render(<SpanDecorationIcon decoration={decoration} />);
    expect(screen.getByRole('img', { name: 'GenAI span' })).toBeInTheDocument();
  });

  it('renders a namespace icon as aria-hidden without a tooltip role', () => {
    const decoration = getSpanDecorationIcon({
      attributes: makeAttributes([{ key: 'db.system', value: 'mysql' }]),
    })!;
    const { container } = render(<SpanDecorationIcon decoration={decoration} />);
    expect(container.querySelector('.SpanDecorationIcon')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it.each(['LLM_CALL', 'TOOL_CALL', 'AGENT', 'RETRIEVAL', 'UNKNOWN_GENAI'] as const)(
    'renders aria-label for genAIKind=%s',
    kind => {
      const decoration = getSpanDecorationIcon({ genAIKind: kind })!;
      render(<SpanDecorationIcon decoration={decoration} />);
      expect(screen.getByRole('img', { name: decoration.label })).toBeInTheDocument();
    }
  );
});
