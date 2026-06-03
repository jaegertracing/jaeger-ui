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
  fireEvent.click(screen.getByTestId('JaegerAskSearchInput--input'));
  return screen.getByTestId('JaegerAskSearchInput--textarea');
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

  it('renders the same styled search input as trace lookup', () => {
    render(
      <MemoryRouter>
        <JaegerAssistantProvider>
          <JaegerAskSearchInput />
        </JaegerAssistantProvider>
      </MemoryRouter>
    );
    const input = screen.getByTestId('JaegerAskSearchInput--input');
    expect(input).toBeInTheDocument();
    expect(input.closest('.TraceIDSearchInput--input')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask Jaeger or lookup trace ID…')).toBeInTheDocument();
  });

  it('opens the floating textarea when search input is clicked', () => {
    render(
      <MemoryRouter>
        <JaegerAssistantProvider>
          <JaegerAskSearchInput />
        </JaegerAssistantProvider>
      </MemoryRouter>
    );
    expect(screen.queryByTestId('JaegerAskSearchInput--textarea')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('JaegerAskSearchInput--input'));
    expect(screen.getByTestId('JaegerAskSearchInput--textarea')).toBeInTheDocument();
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
    expect(screen.getByTestId('JaegerAskSearchInput--textarea')).toBeInTheDocument();
  });

  it('closes the textarea on Escape', () => {
    render(
      <MemoryRouter>
        <JaegerAssistantProvider>
          <JaegerAskSearchInput />
        </JaegerAssistantProvider>
      </MemoryRouter>
    );
    const textarea = openAssistantTextarea();
    fireEvent.keyDown(textarea, { key: 'Escape' });
    expect(screen.queryByTestId('JaegerAskSearchInput--textarea')).not.toBeInTheDocument();
  });

  it('closes floating textarea on mousedown outside trigger and float', () => {
    render(
      <MemoryRouter>
        <JaegerAssistantProvider>
          <JaegerAskSearchInput />
        </JaegerAssistantProvider>
      </MemoryRouter>
    );
    openAssistantTextarea();
    expect(screen.getByTestId('JaegerAskSearchInput--textarea')).toBeInTheDocument();
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    fireEvent.mouseDown(outside);
    document.body.removeChild(outside);
    expect(screen.queryByTestId('JaegerAskSearchInput--textarea')).not.toBeInTheDocument();
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
