// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { HttpAgent } from '@ag-ui/client';
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

const runtimeMock = vi.hoisted(() => {
  const state = {
    isRunning: false,
    listener: /** @type {null | (() => void)} */ (null),
  };
  const thread = {
    getState: () => ({ isRunning: state.isRunning }),
    subscribe: listener => {
      state.listener = listener;
      return () => {
        if (state.listener === listener) state.listener = null;
      };
    },
  };
  return { state, thread, runtime: { mockRuntime: true, thread } };
});

const otelMock = vi.hoisted(() => {
  const state = {
    spans: [],
    activeContext: {},
    contextWith: vi.fn((_ctx, fn) => fn()),
    setSpan: vi.fn((ctx, span) => ({ ctx, span })),
    startSpan: null,
  };
  state.startSpan = vi.fn(() => {
    const span = {
      end: vi.fn(),
      recordException: vi.fn(),
      setStatus: vi.fn(),
    };
    state.spans.push(span);
    return span;
  });
  return state;
});

vi.mock('@opentelemetry/api', () => ({
  context: {
    active: () => otelMock.activeContext,
    with: otelMock.contextWith,
  },
  trace: {
    getTracer: () => ({ startSpan: otelMock.startSpan }),
    setSpan: otelMock.setSpan,
  },
  SpanStatusCode: { ERROR: 2 },
}));

vi.mock('./jaegerAgUi', () => ({
  getJaegerAgUiUrl: () => agUiMock.url,
}));

vi.mock('../../hooks/useJaegerAssistant', () => ({
  useJaegerAssistantConfigured: () => agUiMock.configured,
  useJaegerAssistantEnabled: () => agUiMock.configured,
}));

vi.mock('@ag-ui/client', () => ({
  HttpAgent: vi.fn().mockImplementation(function MockHttpAgent() {}),
}));

vi.mock('@assistant-ui/react-ag-ui', () => ({
  useAgUiRuntime: opts => {
    capturedAgUiOnError.fn = opts?.onError ?? null;
    return runtimeMock.runtime;
  },
}));

vi.mock('@assistant-ui/react', () => ({
  AssistantRuntimeProvider: ({ children }) => <div data-testid="AssistantRuntimeProvider">{children}</div>,
}));

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
    runtimeMock.state.isRunning = false;
    runtimeMock.state.listener = null;
    runtimeMock.runtime.thread = runtimeMock.thread;
    otelMock.spans.length = 0;
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

  it('does not instrument partial runtimes without a thread API', () => {
    agUiMock.configured = true;
    runtimeMock.runtime.thread = undefined;
    expect(() =>
      render(
        <JaegerAssistantProvider>
          <span />
        </JaegerAssistantProvider>
      )
    ).not.toThrow();
    expect(otelMock.startSpan).not.toHaveBeenCalled();
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

  it('passes a fetch wrapper to HttpAgent that survives method-style invocation', async () => {
    // Regression: @ag-ui/client's HttpAgent stores the supplied `fetch` as
    // `this.fetch` and later invokes it as `this.fetch(...)`. Passing the bare
    // global `fetch` would then be called with `this === HttpAgent`, which throws
    // "Illegal invocation" in browsers. The provider must supply a wrapper that
    // detaches the receiver.
    agUiMock.configured = true;
    render(
      <JaegerAssistantProvider>
        <span />
      </JaegerAssistantProvider>
    );
    expect(HttpAgent).toHaveBeenCalledTimes(1);
    const opts = HttpAgent.mock.calls[0][0];
    expect(typeof opts.fetch).toBe('function');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(undefined);
    const receiver = { fetch: opts.fetch };
    await receiver.fetch('/x', { method: 'POST' });
    expect(fetchSpy).toHaveBeenCalledWith('/x', { method: 'POST' });
    fetchSpy.mockRestore();
  });

  it('creates one assistant turn span and parents the AG-UI fetch under it', async () => {
    agUiMock.configured = true;
    render(
      <JaegerAssistantProvider>
        <span />
      </JaegerAssistantProvider>
    );

    expect(otelMock.startSpan).not.toHaveBeenCalled();

    act(() => {
      runtimeMock.state.isRunning = true;
      runtimeMock.state.listener?.();
    });

    expect(otelMock.startSpan).toHaveBeenCalledWith('assistant.turn');
    expect(otelMock.spans).toHaveLength(1);

    const opts = HttpAgent.mock.calls[0][0];
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(undefined);
    await opts.fetch('/x', { method: 'POST' });

    expect(otelMock.setSpan).toHaveBeenCalledWith(otelMock.activeContext, otelMock.spans[0]);
    expect(otelMock.contextWith).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('/x', { method: 'POST' });

    act(() => {
      runtimeMock.state.isRunning = false;
      runtimeMock.state.listener?.();
      runtimeMock.state.listener?.();
    });

    expect(otelMock.spans[0].end).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });

  it('records an AG-UI failure before ending the assistant turn span', () => {
    agUiMock.configured = true;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <JaegerAssistantProvider>
        <span />
      </JaegerAssistantProvider>
    );

    act(() => {
      runtimeMock.state.isRunning = true;
      runtimeMock.state.listener?.();
    });

    const err = new Error('ag-ui-failure');
    capturedAgUiOnError.fn(err);
    expect(otelMock.spans[0].recordException).toHaveBeenCalledWith(err);
    expect(otelMock.spans[0].setStatus).toHaveBeenCalledWith({
      code: 2,
      message: 'ag-ui-failure',
    });

    act(() => {
      runtimeMock.state.isRunning = false;
      runtimeMock.state.listener?.();
    });

    expect(otelMock.spans[0].end).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('ends an active assistant turn span when the runtime unsubscribes', () => {
    agUiMock.configured = true;
    const { unmount } = render(
      <JaegerAssistantProvider>
        <span />
      </JaegerAssistantProvider>
    );

    act(() => {
      runtimeMock.state.isRunning = true;
      runtimeMock.state.listener?.();
    });

    unmount();
    expect(otelMock.spans[0].end).toHaveBeenCalledTimes(1);
    expect(runtimeMock.state.listener).toBeNull();
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
