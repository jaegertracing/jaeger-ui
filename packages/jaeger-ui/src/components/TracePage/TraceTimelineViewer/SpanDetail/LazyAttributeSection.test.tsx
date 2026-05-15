// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import LazyAttributeSection from './LazyAttributeSection';

import { IAttribute } from '../../../../types/otel';

vi.mock('./GenAIAttributeRenderer', () => {
  return {
    default: ({ attribute }: { attribute: IAttribute }) => (
      <div data-testid="gen-ai-renderer">{JSON.stringify(attribute)}</div>
    ),
  };
});

describe('<LazyAttributeSection />', () => {
  const attribute = { key: 'gen_ai.input.messages', value: 'a'.repeat(50000) };

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders collapsed by default with key and size', () => {
    render(<LazyAttributeSection attribute={attribute} />);
    expect(screen.getByText('gen_ai.input.messages')).toBeInTheDocument();
    expect(screen.getByText('48.8 KB')).toBeInTheDocument();
    expect(screen.queryByTestId('gen-ai-renderer')).not.toBeInTheDocument();
  });

  it('expands and renders content when clicked', async () => {
    render(<LazyAttributeSection attribute={attribute} />);
    const header = screen.getByRole('button');
    fireEvent.click(header);

    expect(await screen.findByTestId('gen-ai-renderer')).toBeInTheDocument();
  });

  it('shows loading state for very large attributes', async () => {
    vi.useFakeTimers();
    const largeAttr = { key: 'huge', value: 'a'.repeat(200000) };
    render(<LazyAttributeSection attribute={largeAttr} />);

    const header = screen.getByRole('button');
    fireEvent.click(header);

    expect(screen.getByText('Parsing large payload...')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.queryByText('Parsing large payload...')).not.toBeInTheDocument();
    expect(screen.getByTestId('gen-ai-renderer')).toBeInTheDocument();
  });
});
