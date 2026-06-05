// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import JaegerAskSearchInput, { JaegerAssistantToggle } from './JaegerAskSearchInput';
import { JaegerAssistantProvider } from './JaegerAssistantContext';

const mockNavigate = jest.fn();

const agUiMock = vi.hoisted(() => ({
  configured: false,
}));

vi.mock('react-router-dom', async () => {
  return {
    ...(await vi.importActual('react-router-dom')),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../hooks/useJaegerAssistant', () => ({
  useJaegerAssistantConfigured: () => agUiMock.configured,
  useJaegerAssistantEnabled: () => agUiMock.configured,
}));

function openAssistantTextarea() {
  const textarea = screen.getByTestId('JaegerAskSearchInput--textarea');
  fireEvent.focus(textarea);
  return textarea;
}

describe('<JaegerAskSearchInput /> trace lookup (assistant disabled)', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    agUiMock.configured = false;
  });

  it('renders the main-style trace ID input', () => {
    render(
      <MemoryRouter>
        <JaegerAskSearchInput />
      </MemoryRouter>
    );
    expect(screen.getByTestId('TraceIDSearchInput--form')).toBeInTheDocument();
    expect(screen.getByTestId('idInput')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Lookup by Trace ID...')).toBeInTheDocument();
  });

  it('navigates to trace page on form submit', () => {
    render(
      <MemoryRouter>
        <JaegerAskSearchInput />
      </MemoryRouter>
    );
    const traceId = 'MOCK-TRACE-ID';
    fireEvent.change(screen.getByTestId('idInput'), { target: { value: traceId } });
    fireEvent.submit(screen.getByTestId('TraceIDSearchInput--form'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(`/trace/${traceId}`);
  });

  it('does not navigate when input is empty', () => {
    render(
      <MemoryRouter>
        <JaegerAskSearchInput />
      </MemoryRouter>
    );
    fireEvent.submit(screen.getByTestId('TraceIDSearchInput--form'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('<JaegerAskSearchInput /> assistant mode', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    agUiMock.configured = true;
  });

  it('renders a textarea with the Ask Jaeger placeholder', () => {
    render(
      <MemoryRouter>
        <JaegerAssistantProvider>
          <JaegerAskSearchInput />
        </JaegerAssistantProvider>
      </MemoryRouter>
    );
    expect(screen.getByTestId('JaegerAskSearchInput--textarea')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask Jaeger or lookup trace ID…')).toBeInTheDocument();
  });

  it('expands when focused and collapses when blurred with no text', () => {
    render(
      <MemoryRouter>
        <JaegerAssistantProvider>
          <JaegerAskSearchInput />
        </JaegerAssistantProvider>
      </MemoryRouter>
    );
    const textarea = screen.getByTestId('JaegerAskSearchInput--textarea');
    expect(textarea.closest('.JaegerAskSearchInput--wrap--expanded')).not.toBeInTheDocument();
    fireEvent.focus(textarea);
    expect(textarea.closest('.JaegerAskSearchInput--wrap--expanded')).toBeInTheDocument();
    fireEvent.blur(textarea);
    expect(textarea.closest('.JaegerAskSearchInput--wrap--expanded')).not.toBeInTheDocument();
  });

  it('opens assistant for natural language instead of navigating', () => {
    render(
      <MemoryRouter>
        <JaegerAssistantProvider>
          <JaegerAskSearchInput />
        </JaegerAssistantProvider>
      </MemoryRouter>
    );

    const textarea = openAssistantTextarea();
    fireEvent.change(textarea, { target: { value: 'What is a trace?' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('still navigates for 16–32 hex trace ids', () => {
    render(
      <MemoryRouter>
        <JaegerAssistantProvider>
          <JaegerAskSearchInput />
        </JaegerAssistantProvider>
      </MemoryRouter>
    );

    const traceId = 'a1b2c3d4e5f67890';
    const textarea = openAssistantTextarea();
    fireEvent.change(textarea, { target: { value: traceId } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(mockNavigate).toHaveBeenCalledWith(`/trace/${traceId.toLowerCase()}`);
  });

  it('Shift+Enter does not submit', () => {
    render(
      <MemoryRouter>
        <JaegerAssistantProvider>
          <JaegerAskSearchInput />
        </JaegerAssistantProvider>
      </MemoryRouter>
    );
    const textarea = openAssistantTextarea();
    fireEvent.change(textarea, { target: { value: 'some query' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(textarea).toHaveValue('some query');
  });

  it('collapses and clears on Escape', () => {
    render(
      <MemoryRouter>
        <JaegerAssistantProvider>
          <JaegerAskSearchInput />
        </JaegerAssistantProvider>
      </MemoryRouter>
    );
    const textarea = openAssistantTextarea();
    fireEvent.change(textarea, { target: { value: 'some text' } });
    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(textarea).toBeInTheDocument();
    expect(textarea.closest('.JaegerAskSearchInput--wrap--expanded')).not.toBeInTheDocument();
    expect(textarea).toHaveValue('');
  });

  it('collapses when blurred with no text', () => {
    render(
      <MemoryRouter>
        <JaegerAssistantProvider>
          <JaegerAskSearchInput />
        </JaegerAssistantProvider>
      </MemoryRouter>
    );
    const textarea = openAssistantTextarea();
    expect(textarea.closest('.JaegerAskSearchInput--wrap--expanded')).toBeInTheDocument();
    fireEvent.blur(textarea);
    expect(textarea.closest('.JaegerAskSearchInput--wrap--expanded')).not.toBeInTheDocument();
  });
});

describe('<JaegerAssistantToggle />', () => {
  beforeEach(() => {
    agUiMock.configured = false;
  });

  it('renders nothing when assistant is not configured', () => {
    render(
      <MemoryRouter>
        <JaegerAssistantProvider>
          <JaegerAssistantToggle />
        </JaegerAssistantProvider>
      </MemoryRouter>
    );
    expect(screen.queryByTestId('JaegerAssistantToggle--btn')).not.toBeInTheDocument();
  });

  it('renders nothing outside JaegerAssistantProvider', () => {
    agUiMock.configured = true;
    render(
      <MemoryRouter>
        <JaegerAssistantToggle />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('JaegerAssistantToggle--btn')).not.toBeInTheDocument();
  });

  it('toggles panel open state when configured with provider', () => {
    agUiMock.configured = true;
    render(
      <MemoryRouter>
        <JaegerAssistantProvider>
          <JaegerAssistantToggle />
        </JaegerAssistantProvider>
      </MemoryRouter>
    );
    const btn = screen.getByTestId('JaegerAssistantToggle--btn');
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn).toHaveAttribute('aria-label', 'Open assistant panel');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn).toHaveAttribute('aria-label', 'Close assistant panel');
    expect(btn.className).toContain('JaegerAssistantToggle--btn--active');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });
});
