// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import { JaegerAssistantDock } from './JaegerAssistantPanel';
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

vi.mock('@assistant-ui/react', () => {
  const React = require('react');
  return {
    AssistantRuntimeProvider: ({ children }) => <div data-testid="AssistantRuntimeProvider">{children}</div>,
    useAui: () => ({
      thread: () => ({ append: mockAppend }),
    }),
    useThreadViewportAutoScroll: () => ({ current: null }),
    ComposerPrimitive: {
      Root: ({ children }) => <div data-testid="composer-root">{children}</div>,
      Input: () => <textarea data-testid="composer-input" readOnly />,
      Send: ({ children }) => <button type="button">{children}</button>,
    },
    MessagePartPrimitive: {
      Text: () => <div data-testid="message-part-text" />,
    },
    MessagePrimitive: {
      Root: ({ children, className }) => <div className={className}>{children}</div>,
      Parts: ({ children }) => {
        if (typeof children === 'function') {
          return <>{children({ part: { type: 'text' } })}</>;
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
});
