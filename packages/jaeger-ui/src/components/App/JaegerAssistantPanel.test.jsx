// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

import {
  JaegerAssistantDock,
  JaegerThreadMessageBody,
  threadMessageComponents,
} from './JaegerAssistantPanel';
import { JaegerAssistantProvider, useJaegerAssistantOptional } from './JaegerAssistantContext';

const mockAppend = vi.fn();

const agUiMock = vi.hoisted(() => ({
  configured: false,
  url: 'http://localhost/ag-ui',
}));

const partsMock = vi.hoisted(() => ({
  parts: [{ type: 'text' }],
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
              {partsMock.parts.map((part, i) => (
                <React.Fragment key={i}>{children({ part })}</React.Fragment>
              ))}
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
    partsMock.parts = [{ type: 'text' }, { type: 'reasoning', text: '' }];
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

  describe('drag-to-resize', () => {
    function renderDock() {
      agUiMock.configured = true;
      const { container } = render(
        <MemoryRouter>
          <JaegerAssistantProvider>
            <JaegerAssistantDock />
          </JaegerAssistantProvider>
        </MemoryRouter>
      );
      const aside = container.querySelector('aside[aria-label="Ask Jaeger assistant"]');
      const handle = container.querySelector('.JaegerAssistantPanel-resizeHandle');
      return { aside, handle };
    }

    it('renders a resize handle at the default width', () => {
      const { aside, handle } = renderDock();
      expect(handle).not.toBeNull();
      expect(aside.style.width).toBe('416px');
    });

    it('widens the panel when dragging the handle left', () => {
      const { aside, handle } = renderDock();
      fireEvent.mouseDown(handle, { clientX: 500 });
      fireEvent.mouseMove(document, { clientX: 400 });
      expect(aside.style.width).toBe('516px');
      fireEvent.mouseUp(document);
    });

    it('narrows the panel when dragging the handle right', () => {
      const { aside, handle } = renderDock();
      fireEvent.mouseDown(handle, { clientX: 500 });
      fireEvent.mouseMove(document, { clientX: 550 });
      expect(aside.style.width).toBe('366px');
      fireEvent.mouseUp(document);
    });

    it('clamps width to PANEL_MAX_WIDTH', () => {
      const { aside, handle } = renderDock();
      fireEvent.mouseDown(handle, { clientX: 500 });
      fireEvent.mouseMove(document, { clientX: -1000 });
      expect(aside.style.width).toBe('800px');
      fireEvent.mouseUp(document);
    });

    it('clamps width to PANEL_MIN_WIDTH', () => {
      const { aside, handle } = renderDock();
      fireEvent.mouseDown(handle, { clientX: 500 });
      fireEvent.mouseMove(document, { clientX: 1000 });
      expect(aside.style.width).toBe('320px');
      fireEvent.mouseUp(document);
    });

    it('stops resizing after mouseup', () => {
      const { aside, handle } = renderDock();
      fireEvent.mouseDown(handle, { clientX: 500 });
      fireEvent.mouseMove(document, { clientX: 400 });
      expect(aside.style.width).toBe('516px');
      fireEvent.mouseUp(document);
      fireEvent.mouseMove(document, { clientX: 100 });
      expect(aside.style.width).toBe('516px');
    });

    it('ignores non-left mouse buttons', () => {
      const { aside, handle } = renderDock();
      fireEvent.mouseDown(handle, { clientX: 500, button: 2 });
      fireEvent.mouseMove(document, { clientX: 400 });
      expect(aside.style.width).toBe('416px');
      expect(document.body.style.cursor).toBe('');
    });

    it('tears down a missed drag when a new drag starts', () => {
      const { aside, handle } = renderDock();
      // First drag never receives mouseup (released outside the window).
      fireEvent.mouseDown(handle, { clientX: 500 });
      fireEvent.mouseMove(document, { clientX: 400 });
      expect(aside.style.width).toBe('516px');
      // Second drag starts; the first drag's listeners must not stack.
      fireEvent.mouseDown(handle, { clientX: 500 });
      fireEvent.mouseMove(document, { clientX: 450 });
      expect(aside.style.width).toBe('566px');
      fireEvent.mouseUp(document);
      expect(document.body.style.cursor).toBe('');
      fireEvent.mouseMove(document, { clientX: 100 });
      expect(aside.style.width).toBe('566px');
    });

    it('restores body styles when unmounted mid-drag', () => {
      agUiMock.configured = true;
      const { container, unmount } = render(
        <MemoryRouter>
          <JaegerAssistantProvider>
            <JaegerAssistantDock />
          </JaegerAssistantProvider>
        </MemoryRouter>
      );
      const handle = container.querySelector('.JaegerAssistantPanel-resizeHandle');
      fireEvent.mouseDown(handle, { clientX: 500 });
      expect(document.body.style.cursor).toBe('ew-resize');
      unmount();
      expect(document.body.style.cursor).toBe('');
      expect(document.body.style.userSelect).toBe('');
    });
  });
});

describe('JaegerThreadMessageBody', () => {
  beforeEach(() => {
    partsMock.parts = [{ type: 'text' }, { type: 'reasoning', text: '' }];
  });

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

  it('renders assistant text as markdown instead of MessagePartPrimitive.Text', () => {
    partsMock.parts = [{ type: 'text', text: 'Hello **world**' }];
    const { container } = render(<JaegerThreadMessageBody variant="assistant" />);
    expect(container.querySelector('[data-testid="message-part-text"]')).not.toBeInTheDocument();
    const markdownRoot = container.querySelector('.JaegerAssistantPanel-md');
    expect(markdownRoot).toHaveClass('JaegerAssistantPanel-messageText');
    expect(markdownRoot.querySelector('strong')).toHaveTextContent('world');
  });

  it('still uses MessagePartPrimitive.Text for user variant even when text is present', () => {
    partsMock.parts = [{ type: 'text', text: 'Hello **world**' }];
    const { container } = render(<JaegerThreadMessageBody variant="user" />);
    expect(container.querySelector('[data-testid="message-part-text"]')).toBeInTheDocument();
    expect(container.querySelector('.JaegerAssistantPanel-md')).not.toBeInTheDocument();
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

describe('tool-call part rendering', () => {
  beforeEach(() => {
    partsMock.parts = [{ type: 'text' }];
  });

  it('renders a running indicator when status is running', () => {
    partsMock.parts = [
      { type: 'tool-call', toolName: 'read_skill', status: { type: 'running' }, result: undefined },
    ];
    render(<JaegerThreadMessageBody variant="assistant" />);
    expect(screen.getByText('Calling read_skill…')).toBeInTheDocument();
  });

  it('renders a running indicator when status is requires-action', () => {
    partsMock.parts = [
      { type: 'tool-call', toolName: 'read_skill', status: { type: 'requires-action' }, result: undefined },
    ];
    render(<JaegerThreadMessageBody variant="assistant" />);
    expect(screen.getByText('Calling read_skill…')).toBeInTheDocument();
  });

  it('renders completed state when status is complete even if result is undefined', () => {
    partsMock.parts = [
      { type: 'tool-call', toolName: 'find_traces', status: { type: 'complete' }, result: undefined },
    ];
    render(<JaegerThreadMessageBody variant="assistant" />);
    expect(screen.getByText('Called find_traces')).toBeInTheDocument();
    expect(screen.queryByText('Calling find_traces…')).not.toBeInTheDocument();
    expect(screen.queryByText('Output')).not.toBeInTheDocument();
  });

  it('renders a collapsible details element when tool-call part has a result', () => {
    partsMock.parts = [
      { type: 'tool-call', toolName: 'find_traces', status: { type: 'complete' }, result: 'found 3 traces' },
    ];
    render(<JaegerThreadMessageBody variant="assistant" />);
    expect(screen.getByText('Called find_traces')).toBeInTheDocument();
    expect(screen.getByText('found 3 traces')).toBeInTheDocument();
    expect(screen.queryByText('Calling find_traces…')).not.toBeInTheDocument();
    const details = document.querySelector('details.JaegerAssistantPanel-toolCall');
    expect(details).toBeInTheDocument();
    expect(details.open).toBe(false);
  });

  it('shows Input and Output labels when argsText is present', () => {
    partsMock.parts = [
      {
        type: 'tool-call',
        toolName: 'get_services',
        argsText: '{}',
        status: { type: 'complete' },
        result: '{"services":["jaeger"]}',
      },
    ];
    const { container } = render(<JaegerThreadMessageBody variant="assistant" />);
    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.getByText('Output')).toBeInTheDocument();
    expect(screen.getByText('{}')).toBeInTheDocument();
    expect(container.querySelector('.json-markup')).toBeInTheDocument();
  });

  it('omits Input section when argsText is empty', () => {
    partsMock.parts = [
      {
        type: 'tool-call',
        toolName: 'get_services',
        argsText: '',
        status: { type: 'complete' },
        result: 'ok',
      },
    ];
    render(<JaegerThreadMessageBody variant="assistant" />);
    expect(screen.queryByText('Input')).not.toBeInTheDocument();
    expect(screen.getByText('Output')).toBeInTheDocument();
  });

  it('renders JSON results with JsonView for object values', () => {
    partsMock.parts = [
      {
        type: 'tool-call',
        toolName: 'get_services',
        status: { type: 'complete' },
        result: { services: ['jaeger'] },
      },
    ];
    const { container } = render(<JaegerThreadMessageBody variant="assistant" />);
    expect(container.querySelector('.json-markup')).toBeInTheDocument();
  });

  it('renders JSON results with JsonView for JSON string values', () => {
    partsMock.parts = [
      {
        type: 'tool-call',
        toolName: 'get_services',
        status: { type: 'complete' },
        result: '{"services":["jaeger"]}',
      },
    ];
    const { container } = render(<JaegerThreadMessageBody variant="assistant" />);
    expect(container.querySelector('.json-markup')).toBeInTheDocument();
  });

  it('renders non-string non-object result via formatToolResult', () => {
    partsMock.parts = [
      { type: 'tool-call', toolName: 'count_tool', status: { type: 'complete' }, result: 42 },
    ];
    render(<JaegerThreadMessageBody variant="assistant" />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders plain text result in pre when not JSON', () => {
    partsMock.parts = [
      { type: 'tool-call', toolName: 'bad_tool', status: { type: 'complete' }, result: 'plain text output' },
    ];
    render(<JaegerThreadMessageBody variant="assistant" />);
    expect(screen.getByText('plain text output')).toBeInTheDocument();
  });

  it('renders Failed label with error border when isError is true', () => {
    partsMock.parts = [
      {
        type: 'tool-call',
        toolName: 'bad_tool',
        status: { type: 'complete' },
        isError: true,
        result: 'error msg',
      },
    ];
    render(<JaegerThreadMessageBody variant="assistant" />);
    expect(screen.getByText('Failed bad_tool')).toBeInTheDocument();
    const details = document.querySelector('.JaegerAssistantPanel-toolCall--error');
    expect(details).toBeInTheDocument();
  });

  it('renders Failed label when status is incomplete', () => {
    partsMock.parts = [
      { type: 'tool-call', toolName: 'bad_tool', status: { type: 'incomplete' }, result: undefined },
    ];
    render(<JaegerThreadMessageBody variant="assistant" />);
    expect(screen.getByText('Failed bad_tool')).toBeInTheDocument();
  });

  it('renders text parts correctly alongside tool-call parts', () => {
    partsMock.parts = [
      { type: 'text' },
      { type: 'tool-call', toolName: 'read_skill', status: { type: 'complete' }, result: 'done' },
    ];
    const { container } = render(<JaegerThreadMessageBody variant="assistant" />);
    expect(container.querySelectorAll('[data-testid="message-part-text"]')).toHaveLength(1);
    expect(screen.getByText('Called read_skill')).toBeInTheDocument();
    expect(screen.getByText('done')).toBeInTheDocument();
  });
});
