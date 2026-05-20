// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  JaegerAssistantProvider,
  useJaegerAssistant,
  useJaegerAssistantOptional,
} from './JaegerAssistantContext';

const agUiMock = vi.hoisted(() => ({
  configured: false,
  url: 'http://localhost/ag-ui',
}));

const capturedAgUiOnError = vi.hoisted(() => ({ fn: /** @type {null | ((e: unknown) => void)} */ (null) }));

vi.mock('./jaegerAgUi', () => ({
  getJaegerAgUiUrl: () => agUiMock.url,
  isJaegerAssistantConfigured: () => agUiMock.configured,
}));

vi.mock('@ag-ui/client', () => ({
  HttpAgent: vi.fn().mockImplementation(function MockHttpAgent() {}),
}));

vi.mock('@assistant-ui/react-ag-ui', () => ({
  useAgUiRuntime: opts => {
    capturedAgUiOnError.fn = opts?.onError ?? null;
    return { mockRuntime: true };
  },
}));

vi.mock('@assistant-ui/react', () => ({
  AssistantRuntimeProvider: ({ children }) => <div data-testid="AssistantRuntimeProvider">{children}</div>,
}));

vi.mock('./JaegerAssistantToolsRegistrar', () => ({ default: () => null }));

function BadConsumer() {
  useJaegerAssistant();
  return null;
}

function OptionalConsumer() {
  const ctx = useJaegerAssistantOptional();
  return <span data-testid="optional">{ctx === null ? 'null' : 'ok'}</span>;
}

function FullConsumer() {
  const ctx = useJaegerAssistantOptional();
  return (
    <>
      <span data-testid="panel-open">{String(ctx?.panelOpen)}</span>
      <span data-testid="bootstrap">{ctx?.bootstrapUserText ?? 'none'}</span>
      <button type="button" onClick={() => ctx?.requestAskJaeger('hello')}>
        ask
      </button>
      <button type="button" onClick={() => ctx?.clearBootstrap()}>
        clear
      </button>
    </>
  );
}

describe('JaegerAssistantContext', () => {
  beforeEach(() => {
    agUiMock.configured = false;
    capturedAgUiOnError.fn = null;
    vi.clearAllMocks();
  });

  it('useJaegerAssistantOptional returns null outside provider', () => {
    render(<OptionalConsumer />);
    expect(screen.getByTestId('optional')).toHaveTextContent('null');
  });

  it('useJaegerAssistant throws outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<BadConsumer />)).toThrow(
      'useJaegerAssistant must be used within JaegerAssistantProvider'
    );
    spy.mockRestore();
  });

  it('does not wrap with AssistantRuntimeProvider when assistant is not configured', () => {
    agUiMock.configured = false;
    render(
      <JaegerAssistantProvider>
        <OptionalConsumer />
      </JaegerAssistantProvider>
    );
    expect(screen.queryByTestId('AssistantRuntimeProvider')).not.toBeInTheDocument();
    expect(screen.getByTestId('optional')).toHaveTextContent('ok');
  });

  it('wraps with AssistantRuntimeProvider when assistant is configured', () => {
    agUiMock.configured = true;
    render(
      <JaegerAssistantProvider>
        <span data-testid="child" />
      </JaegerAssistantProvider>
    );
    expect(screen.getByTestId('AssistantRuntimeProvider')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('requestAskJaeger sets bootstrap text and opens panel', () => {
    agUiMock.configured = true;
    render(
      <JaegerAssistantProvider>
        <FullConsumer />
      </JaegerAssistantProvider>
    );
    expect(screen.getByTestId('panel-open')).toHaveTextContent('false');
    expect(screen.getByTestId('bootstrap')).toHaveTextContent('none');
    fireEvent.click(screen.getByRole('button', { name: 'ask' }));
    expect(screen.getByTestId('panel-open')).toHaveTextContent('true');
    expect(screen.getByTestId('bootstrap')).toHaveTextContent('hello');
  });

  it('clearBootstrap clears bootstrap text', () => {
    agUiMock.configured = true;
    render(
      <JaegerAssistantProvider>
        <FullConsumer />
      </JaegerAssistantProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'ask' }));
    expect(screen.getByTestId('bootstrap')).toHaveTextContent('hello');
    fireEvent.click(screen.getByRole('button', { name: 'clear' }));
    expect(screen.getByTestId('bootstrap')).toHaveTextContent('none');
  });

  it('useAgUiRuntime onError logs AG-UI errors (lines 29–30)', () => {
    agUiMock.configured = true;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <JaegerAssistantProvider>
        <span data-testid="child" />
      </JaegerAssistantProvider>
    );
    expect(capturedAgUiOnError.fn).toEqual(expect.any(Function));
    const err = new Error('ag-ui-failure');
    capturedAgUiOnError.fn(err);
    expect(spy).toHaveBeenCalledWith('[jaeger-assistant] AG-UI error', err);
    spy.mockRestore();
  });
});
