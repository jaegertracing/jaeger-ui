// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import {
  JaegerAssistantDock,
  JaegerThreadMessageBody,
  JaegerToolCallPart,
  threadMessageComponents,
} from './JaegerAssistantPanel';
import { JaegerAssistantProvider, useJaegerAssistantOptional } from './JaegerAssistantContext';

const mockAppend = vi.fn();

const agUiMock = vi.hoisted(() => ({
  configured: false,
  url: 'http://localhost/ag-ui',
}));

vi.mock('./jaegerAgUi', () => ({
  getJaegerAgUiUrl: () => agUiMock.url,
  isJaegerAssistantConfigured: () => agUiMock.configured,
}));

vi.mock('@ag-ui/client', () => ({
  HttpAgent: vi.fn().mockImplementation(function MockHttpAgent() {}),
}));

vi.mock('@assistant-ui/react-ag-ui', () => ({
  useAgUiRuntime: () => ({ mockRuntime: true }),
}));

vi.mock('./JaegerAssistantToolsRegistrar', () => ({ default: () => null }));

vi.mock('@assistant-ui/react', () => {
  const React = require('react');
  return {
    AssistantRuntimeProvider: ({ children }) => <div data-testid="AssistantRuntimeProvider">{children}</div>,
    useAui: () => ({
      thread: () => ({ append: mockAppend }),
    }),
    Tools: vi.fn(() => ({})),
    useThreadViewportAutoScroll: () => ({ current: null }),
    ComposerPrimitive: {
      Root: ({ children }) => <div data-testid="composer-root">{children}</div>,
      Input: () => <textarea data-testid="composer-input" readOnly />,
      Send: ({ children }) => <button type="button">{children}</button>,
    },
    MessagePartPrimitive: {
      Text: ({ className, component: Comp = 'div' }) =>
        React.createElement(Comp, { 'data-testid': 'message-part-text', className }),
    },
    MessagePrimitive: {
      Root: ({ children, className }) => (
        <div data-testid="message-primitive-root" className={className}>
          {children}
        </div>
      ),
      Parts: ({ children }) => {
        if (typeof children === 'function') {
          return (
            <>
              {children({ part: { type: 'text' } })}
              {children({ part: { type: 'reasoning' } })}
              {children({
                part: {
                  type: 'tool-call',
                  toolName: 'highlight_span',
                  state: 'result',
                  result: { ok: true, matchCount: 3 },
                },
              })}
            </>
          );
        }
        return children;
      },
    },
    ThreadPrimitive: {
      Root: ({ children }) => <div data-testid="thread-root">{children}</div>,
      Viewport: React.forwardRef(({ children }, ref) => (
        <div ref={ref} data-testid="thread-viewport">
          {children}
        </div>
      )),
      Empty: ({ children }) => <div data-testid="thread-empty">{children}</div>,
      Messages: () => null,
    },
  };
});

function OpenPanelButton() {
  const a = useJaegerAssistantOptional();
  return (
    <button type="button" onClick={() => a?.setPanelOpen(true)}>
      open panel
    </button>
  );
}

function AskBootstrapButton({ text }) {
  const a = useJaegerAssistantOptional();
  return (
    <button type="button" onClick={() => a?.requestAskJaeger(text)}>
      ask-bootstrap-{text}
    </button>
  );
}

describe('JaegerAssistantDock', () => {
  beforeEach(() => {
    agUiMock.configured = false;
    mockAppend.mockReset();
  });

  it('returns null when assistant is not configured', () => {
    agUiMock.configured = false;
    render(
      <MemoryRouter>
        <JaegerAssistantProvider>
          <JaegerAssistantDock />
        </JaegerAssistantProvider>
      </MemoryRouter>
    );
    expect(screen.queryByRole('complementary', { name: 'Ask Jaeger assistant' })).not.toBeInTheDocument();
  });

  it('returns null when there is no JaegerAssistantProvider', () => {
    agUiMock.configured = true;
    render(
      <MemoryRouter>
        <JaegerAssistantDock />
      </MemoryRouter>
    );
    expect(screen.queryByRole('complementary', { name: 'Ask Jaeger assistant' })).not.toBeInTheDocument();
  });

  it('renders aside when configured with provider; hidden until panel open', () => {
    agUiMock.configured = true;
    const { container } = render(
      <MemoryRouter>
        <JaegerAssistantProvider>
          <JaegerAssistantDock />
          <OpenPanelButton />
        </JaegerAssistantProvider>
      </MemoryRouter>
    );
    const aside = container.querySelector('aside[aria-label="Ask Jaeger assistant"]');
    expect(aside).not.toBeNull();
    expect(aside).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('heading', { name: 'Ask Jaeger', hidden: true })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'open panel' }));
    expect(aside).toHaveAttribute('aria-hidden', 'false');
  });

  it('close button sets panel closed', () => {
    agUiMock.configured = true;
    const { container } = render(
      <MemoryRouter>
        <JaegerAssistantProvider>
          <JaegerAssistantDock />
          <OpenPanelButton />
        </JaegerAssistantProvider>
      </MemoryRouter>
    );
    const aside = container.querySelector('aside[aria-label="Ask Jaeger assistant"]');
    expect(aside).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'open panel' }));
    expect(aside).toHaveAttribute('aria-hidden', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Close assistant panel' }));
    expect(aside).toHaveAttribute('aria-hidden', 'true');
  });

  it('bootstrap effect clears bootstrap and appends to thread (lines 26–28)', async () => {
    agUiMock.configured = true;
    render(
      <MemoryRouter>
        <JaegerAssistantProvider>
          <JaegerAssistantDock />
          <AskBootstrapButton text="hi" />
        </JaegerAssistantProvider>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: 'ask-bootstrap-hi' }));
    await waitFor(() => expect(mockAppend).toHaveBeenCalledWith('hi'));
  });
});

describe('JaegerThreadMessageBody', () => {
  it('renders text parts with MessagePartPrimitive.Text (lines 34–47)', () => {
    const { container } = render(<JaegerThreadMessageBody variant="user" />);
    const root = screen.getByTestId('message-primitive-root');
    expect(root).toHaveClass('JaegerAssistantPanel-message', 'JaegerAssistantPanel-message--user');
    expect(container.querySelectorAll('[data-testid="message-part-text"]')).toHaveLength(1);
    expect(screen.getByTestId('message-part-text')).toHaveClass('JaegerAssistantPanel-messageText');
  });

  it('renders assistant variant classes', () => {
    render(<JaegerThreadMessageBody variant="assistant" />);
    expect(screen.getByTestId('message-primitive-root')).toHaveClass(
      'JaegerAssistantPanel-message--assistant'
    );
  });
});

describe('threadMessageComponents', () => {
  it('UserMessage wraps user variant (line 56)', () => {
    const { UserMessage } = threadMessageComponents;
    const { container } = render(<UserMessage />);
    expect(container.querySelector('.JaegerAssistantPanel-row--user')).toBeInTheDocument();
    expect(screen.getByTestId('message-primitive-root')).toHaveClass('JaegerAssistantPanel-message--user');
  });

  it('AssistantMessage wraps assistant variant (line 63)', () => {
    const { AssistantMessage } = threadMessageComponents;
    const { container } = render(<AssistantMessage />);
    expect(container.querySelector('.JaegerAssistantPanel-row--assistant')).toBeInTheDocument();
    expect(screen.getByTestId('message-primitive-root')).toHaveClass(
      'JaegerAssistantPanel-message--assistant'
    );
  });
});

describe('JaegerToolCallPart', () => {
  function makePart(overrides = {}) {
    return {
      type: 'tool-call',
      toolName: 'highlight_span',
      state: 'result',
      result: { ok: true, matchCount: 2 },
      ...overrides,
    };
  }

  it('shows pending state when tool call is in-flight', () => {
    render(<JaegerToolCallPart part={makePart({ state: 'call', result: undefined })} />);
    expect(screen.getByTestId('toolcall-pending')).toBeInTheDocument();
    expect(screen.getByTestId('toolcall-pending')).toHaveTextContent('Locating span');
  });

  it('shows pending state when result is null', () => {
    render(<JaegerToolCallPart part={makePart({ state: 'result', result: null })} />);
    expect(screen.getByTestId('toolcall-pending')).toBeInTheDocument();
  });

  it('shows ok state with match count', () => {
    render(<JaegerToolCallPart part={makePart()} />);
    expect(screen.getByTestId('toolcall-ok')).toHaveTextContent('Highlighted 2 spans');
  });

  it('uses singular "span" for matchCount=1', () => {
    render(<JaegerToolCallPart part={makePart({ result: { ok: true, matchCount: 1 } })} />);
    expect(screen.getByTestId('toolcall-ok')).toHaveTextContent('Highlighted 1 span');
  });

  it('shows "Navigated to trace" when matchCount is not provided', () => {
    render(<JaegerToolCallPart part={makePart({ result: { ok: true } })} />);
    expect(screen.getByTestId('toolcall-ok')).toHaveTextContent('Navigated to trace');
  });

  it('shows error message when ok=false', () => {
    render(<JaegerToolCallPart part={makePart({ result: { ok: false, error: 'No spans match "foo".' } })} />);
    expect(screen.getByTestId('toolcall-error')).toHaveTextContent('No spans match "foo".');
  });

  it('falls back to generic error when error is missing', () => {
    render(<JaegerToolCallPart part={makePart({ result: { ok: false } })} />);
    expect(screen.getByTestId('toolcall-error')).toHaveTextContent('Could not locate span.');
  });

  it('JaegerThreadMessageBody renders tool-call parts', () => {
    render(<JaegerThreadMessageBody variant="assistant" />);
    expect(screen.getByTestId('toolcall-ok')).toBeInTheDocument();
  });
});
