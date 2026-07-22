// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

import GenAITab from '.';
import { useMessageFormatStore } from './message-format-store';
import type { IAttribute, IOtelSpan } from '../../../../../types/otel';
import { makeAttributes } from '../../../../../model/attributes';
import { classifySpan } from '../../../../../utils/genai/detect';

// genAIKind is always attribute-derived in production (OtelSpanFacade computes it via
// classifySpan, never set independently) - deriving it here the same way keeps these
// tests from silently diverging from real span behavior.
function makeSpan(attributes: IAttribute[]): IOtelSpan {
  const spanAttributes = makeAttributes(attributes);
  return {
    spanID: 'abc123',
    attributes: spanAttributes,
    genAIKind: classifySpan({ attributes: spanAttributes }),
  } as unknown as IOtelSpan;
}

describe('GenAITab', () => {
  beforeEach(() => {
    localStorage.clear();
    // useMessageFormatStore is a module-level singleton, so its in-memory overrides
    // outlive any single render() and must be reset explicitly - clearing localStorage
    // alone only affects what a *future* store creation would hydrate from.
    useMessageFormatStore.setState({ overrides: {} });
  });

  it('renders provider and model when present', () => {
    render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.provider.name', value: 'openai' },
          { key: 'gen_ai.response.model', value: 'gpt-4o' },
        ])}
      />
    );
    expect(screen.getByText('openai')).toBeInTheDocument();
    expect(screen.getByText('gpt-4o')).toBeInTheDocument();
  });

  it('prefixes the provider/model row with "LLM:" on an actual LLM call, so it reads as a labeled group like Tokens: does (#4237)', () => {
    const { container } = render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.operation.name', value: 'chat' },
          { key: 'gen_ai.provider.name', value: 'openai' },
          { key: 'gen_ai.response.model', value: 'gpt-4o' },
        ])}
      />
    );
    const prefix = screen.getByText('LLM:');
    expect(prefix).toBeInTheDocument();
    expect(prefix).toHaveClass('GenAITab--metaPrefix');
    const metaRow = container.querySelector('.GenAITab--meta');
    expect(metaRow?.firstElementChild).toBe(prefix);
  });

  it('omits the "LLM:" prefix on a non-LLM span that also reports a provider, without hiding the provider itself', () => {
    render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.operation.name', value: 'invoke_agent' },
          { key: 'gen_ai.provider.name', value: 'anthropic' },
        ])}
      />
    );
    // classifySpan() resolves this to AGENT, not LLM_CALL - captioning it "LLM:" would
    // misrepresent an agent invocation as an LLM call, per Ansh's review on #4244.
    expect(screen.queryByText('LLM:')).not.toBeInTheDocument();
    expect(screen.getByText('anthropic')).toBeInTheDocument();
  });

  it('elevates gen_ai.agent.* attributes into their own Agent section instead of the raw Other GenAI Attributes dump (#4237)', () => {
    render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.agent.name', value: 'jaeger-gemini-sidecar' },
          { key: 'gen_ai.agent.version', value: '0.1.0' },
        ])}
      />
    );
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('jaeger-gemini-sidecar')).toBeInTheDocument();
    expect(screen.getByText('Version')).toBeInTheDocument();
    expect(screen.getByText('0.1.0')).toBeInTheDocument();
    // The claimed keys must not also appear as raw gen_ai.agent.name / gen_ai.agent.version
    // rows in the Other GenAI Attributes accordion.
    expect(screen.queryByText('gen_ai.agent.name')).not.toBeInTheDocument();
    expect(screen.queryByText('gen_ai.agent.version')).not.toBeInTheDocument();
  });

  it('renders an Agent section from gen_ai.agent.id and gen_ai.agent.description too', () => {
    render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.agent.id', value: 'asst_5j66UpCpwteGg4YSxUnt7lPY' },
          { key: 'gen_ai.agent.description', value: 'Helps with math problems' },
        ])}
      />
    );
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('asst_5j66UpCpwteGg4YSxUnt7lPY')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Helps with math problems')).toBeInTheDocument();
  });

  it('renders token usage including cached and reasoning tokens', () => {
    render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.usage.input_tokens', value: 100 },
          { key: 'gen_ai.usage.output_tokens', value: 50 },
          { key: 'gen_ai.usage.cache_read.input_tokens', value: 80 },
          { key: 'gen_ai.usage.reasoning.output_tokens', value: 20 },
        ])}
      />
    );
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('prefixes the token usage row with "Tokens:" so the numbers are labeled as a group (#4219)', () => {
    const { container } = render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.usage.input_tokens', value: 100 },
          { key: 'gen_ai.usage.output_tokens', value: 50 },
        ])}
      />
    );
    const prefix = screen.getByText('Tokens:');
    expect(prefix).toBeInTheDocument();
    expect(prefix).toHaveClass('GenAITab--tokensPrefix');
    // The prefix must actually lead the row, not just be present somewhere on
    // the page - assert it precedes the Input/Output items in document order.
    const tokensRow = container.querySelector('.GenAITab--tokens');
    expect(tokensRow?.firstElementChild).toBe(prefix);
  });

  it('renders a zero input token count, not treating it as missing', () => {
    render(<GenAITab span={makeSpan([{ key: 'gen_ai.usage.input_tokens', value: 0 }])} />);
    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders conversation messages with role labels, visible by default', () => {
    render(
      <GenAITab
        span={makeSpan([
          {
            key: 'gen_ai.input.messages',
            value: [{ role: 'user', content: 'What is the weather?' }],
          },
          {
            key: 'gen_ai.output.messages',
            value: [{ role: 'assistant', content: 'It is sunny.' }],
          },
        ])}
      />
    );
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('What is the weather?')).toBeInTheDocument();
    expect(screen.getByText('assistant')).toBeInTheDocument();
    expect(screen.getByText('It is sunny.')).toBeInTheDocument();
  });

  it('defaults message content to plain text, showing markdown syntax literally', () => {
    const { container } = render(
      <GenAITab
        span={makeSpan([
          {
            key: 'gen_ai.output.messages',
            value: [{ role: 'assistant', content: 'Here is **bold** and a list:\n- one\n- two' }],
          },
        ])}
      />
    );
    expect(screen.getByText(/\*\*bold\*\*/)).toBeInTheDocument();
    const content = container.querySelector('.GenAITab--messageContent-plain');
    expect(content?.tagName).toBe('PRE');
    expect(content?.querySelector('strong')).toBeNull();
  });

  it('renders markdown formatting once the user switches the format dropdown to Markdown', () => {
    const { container } = render(
      <GenAITab
        span={makeSpan([
          {
            key: 'gen_ai.output.messages',
            value: [{ role: 'assistant', content: 'Here is **bold** and a list:\n- one\n- two' }],
          },
        ])}
      />
    );
    fireEvent.change(screen.getByLabelText(/Content format/), { target: { value: 'markdown' } });
    const content = container.querySelector('.GenAITab--messageContent');
    expect(content?.querySelector('strong')).toHaveTextContent('bold');
    expect(content?.querySelectorAll('li')).toHaveLength(2);
    expect(content?.textContent).not.toContain('**bold**');
  });

  it('wraps a single-sentence markdown message in a real block element, not a bare inline span', () => {
    // Regression test: markdown-to-jsx only wraps its compiled output in a block
    // element once there is more than one top-level node. A short, single-sentence
    // message with no other markdown formatting compiles to exactly one inline node,
    // and without forceBlock the message content class lands on a bare <span> -
    // padding on that inline element only shows at the start/end of the whole run,
    // not around each wrapped line, producing an indented first line with no padding
    // on the rest of the paragraph once it wraps.
    const { container } = render(
      <GenAITab
        span={makeSpan([
          {
            key: 'gen_ai.output.messages',
            value: [
              { role: 'assistant', content: 'A single plain sentence with no markdown syntax at all.' },
            ],
          },
        ])}
      />
    );
    fireEvent.change(screen.getByLabelText(/Content format/), { target: { value: 'markdown' } });
    const content = container.querySelector('.GenAITab--messageContent');
    expect(content?.tagName).toBe('DIV');
    expect(content?.querySelector('p')).toHaveTextContent(
      'A single plain sentence with no markdown syntax at all.'
    );
  });

  it('renders a fenced code block once switched to Markdown, with the shared code styling', () => {
    const { container } = render(
      <GenAITab
        span={makeSpan([
          {
            key: 'gen_ai.output.messages',
            value: [{ role: 'assistant', content: '```js\nconst x = 1;\n```' }],
          },
        ])}
      />
    );
    fireEvent.change(screen.getByLabelText(/Content format/), { target: { value: 'markdown' } });
    const content = container.querySelector('.GenAITab--messageContent');
    expect(content?.querySelector('pre code')).toHaveTextContent('const x = 1;');
  });

  it('falls back to plain text for a message over the markdown size limit, keeping the dropdown in sync', () => {
    const oversizedContent = `**bold** ${'x'.repeat(150_001)}`;
    const { container } = render(
      <GenAITab
        span={makeSpan([
          {
            key: 'gen_ai.output.messages',
            value: [{ role: 'assistant', content: oversizedContent }],
          },
        ])}
      />
    );
    const select = screen.getByLabelText(/Content format/) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'markdown' } });

    // The dropdown must reflect what's actually rendered, not the stored preference -
    // showing "Markdown" while the content renders as plain would be misleading.
    expect(select).toHaveValue('plain');
    const markdownOption = select.querySelector('option[value="markdown"]') as HTMLOptionElement;
    expect(markdownOption.disabled).toBe(true);
    const content = container.querySelector('.GenAITab--messageContent-plain');
    expect(content?.tagName).toBe('PRE');
    expect(content?.querySelector('strong')).toBeNull();
  });

  it('defaults message content that parses as JSON to the interactive tree view, not plain or markdown', () => {
    const { container } = render(
      <GenAITab
        span={makeSpan([
          {
            key: 'gen_ai.output.messages',
            value: [{ role: 'assistant', content: JSON.stringify({ answer: 42 }) }],
          },
        ])}
      />
    );
    expect(container.querySelector('.GenAITab--json .json-markup-key')?.textContent).toContain('answer');
    expect(screen.getByLabelText(/Content format/)).toHaveValue('json');
  });

  it('defaults pretty-printed JSON with leading whitespace to the interactive tree view, not plain text', () => {
    const { container } = render(
      <GenAITab
        span={makeSpan([
          {
            key: 'gen_ai.output.messages',
            value: [{ role: 'assistant', content: `\n${JSON.stringify({ answer: 42 }, null, 2)}` }],
          },
        ])}
      />
    );
    expect(container.querySelector('.GenAITab--json .json-markup-key')?.textContent).toContain('answer');
    expect(screen.getByLabelText(/Content format/)).toHaveValue('json');
  });

  it('disables the JSON option on a message whose content does not parse as JSON', () => {
    render(
      <GenAITab
        span={makeSpan([
          {
            key: 'gen_ai.output.messages',
            value: [{ role: 'assistant', content: 'Just a plain sentence, no JSON here.' }],
          },
        ])}
      />
    );
    const select = screen.getByLabelText(/Content format/) as HTMLSelectElement;
    const jsonOption = select.querySelector('option[value="json"]') as HTMLOptionElement;
    expect(jsonOption.disabled).toBe(true);
  });

  it('falls back to plain text on a message whose content is not valid JSON, even when the attribute-level preference is JSON, keeping the dropdown in sync', () => {
    const { container } = render(
      <GenAITab
        span={makeSpan([
          {
            key: 'gen_ai.output.messages',
            value: [
              { role: 'assistant', content: JSON.stringify({ answer: 42 }) },
              { role: 'assistant', content: 'This is plain prose, not JSON.' },
            ],
          },
        ])}
      />
    );
    const [firstSelect, secondSelect] = screen.getAllByLabelText(/Content format/) as HTMLSelectElement[];
    // The format preference is stored per attribute name, not per message - explicitly
    // selecting JSON on the first (valid-JSON) message sets that attribute-level
    // preference, which the second message also picks up despite its own content not
    // being JSON.
    fireEvent.change(firstSelect, { target: { value: 'json' } });

    expect(secondSelect).toHaveValue('plain');
    const jsonOption = secondSelect.querySelector('option[value="json"]') as HTMLOptionElement;
    expect(jsonOption.disabled).toBe(true);
    const secondBlock = screen.getByText('This is plain prose, not JSON.').closest('.GenAITab--message');
    expect(secondBlock?.querySelector('.GenAITab--messageContent-plain')).toBeInTheDocument();
    expect(container.querySelectorAll('.GenAITab--json')).toHaveLength(1);
  });

  it('persists the chosen format per attribute name, applying it to a later message from the same attribute', () => {
    const { unmount } = render(
      <GenAITab
        span={makeSpan([
          {
            key: 'gen_ai.output.messages',
            value: [{ role: 'assistant', content: 'Here is **bold** text.' }],
          },
        ])}
      />
    );
    fireEvent.change(screen.getByLabelText(/Content format/), { target: { value: 'markdown' } });
    unmount();

    const { container } = render(
      <GenAITab
        span={makeSpan([
          {
            key: 'gen_ai.output.messages',
            value: [{ role: 'assistant', content: 'A second, unrelated **bold** message.' }],
          },
        ])}
      />
    );
    expect(screen.getByLabelText(/Content format/)).toHaveValue('markdown');
    expect(container.querySelector('.GenAITab--messageContent strong')).toBeInTheDocument();
  });

  it('applies a format change to every currently-rendered message from the same attribute immediately, not just future mounts', () => {
    const { container } = render(
      <GenAITab
        span={makeSpan([
          {
            key: 'gen_ai.output.messages',
            value: [
              { role: 'assistant', content: 'First **bold** message.' },
              { role: 'assistant', content: 'Second **bold** message.' },
            ],
          },
        ])}
      />
    );
    const [firstSelect, secondSelect] = screen.getAllByLabelText(/Content format/);
    fireEvent.change(firstSelect, { target: { value: 'markdown' } });
    expect(secondSelect).toHaveValue('markdown');
    expect(container.querySelectorAll('.GenAITab--messageContent strong')).toHaveLength(2);
  });

  it('gives each format dropdown a distinct accessible name including role and position, not a shared generic label', () => {
    render(
      <GenAITab
        span={makeSpan([
          {
            key: 'gen_ai.input.messages',
            value: [{ role: 'user', content: 'What is the weather?' }],
          },
          {
            key: 'gen_ai.output.messages',
            value: [{ role: 'assistant', content: 'It is sunny.' }],
          },
        ])}
      />
    );
    expect(screen.getByLabelText('Content format for message 1 (user)')).toBeInTheDocument();
    expect(screen.getByLabelText('Content format for message 2 (assistant)')).toBeInTheDocument();
  });

  it('keeps the format preference scoped per attribute name, not shared across attributes', () => {
    const { container } = render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.output.messages', value: [{ role: 'assistant', content: 'Output text.' }] },
          { key: 'gen_ai.input.messages', value: [{ role: 'user', content: 'Input text.' }] },
        ])}
      />
    );
    const outputBlock = screen.getByText('Output text.').closest('.GenAITab--message');
    const inputBlock = screen.getByText('Input text.').closest('.GenAITab--message');
    const outputSelect = outputBlock?.querySelector('.GenAITab--formatSelect') as HTMLSelectElement;
    const inputSelect = inputBlock?.querySelector('.GenAITab--formatSelect') as HTMLSelectElement;

    fireEvent.change(outputSelect, { target: { value: 'markdown' } });
    expect(inputSelect).toHaveValue('plain');
    expect(container.querySelectorAll('.GenAITab--formatSelect')).toHaveLength(2);
  });

  it('renders system instructions as a system-role message, visible by default', () => {
    render(
      <GenAITab
        span={makeSpan([
          {
            key: 'gen_ai.system_instructions',
            value: [{ type: 'text', content: 'You are a helpful assistant.' }],
          },
        ])}
      />
    );
    expect(screen.getByText('system')).toBeInTheDocument();
    expect(screen.getByText('You are a helpful assistant.')).toBeInTheDocument();
  });

  it('renders a tool call with arguments and result together', () => {
    render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.tool.name', value: 'get_weather' },
          { key: 'gen_ai.tool.call.arguments', value: { city: 'NYC' } },
          { key: 'gen_ai.tool.call.result', value: { tempF: 72 } },
        ])}
      />
    );
    expect(screen.getByText('Tool Call: get_weather')).toBeInTheDocument();
    expect(screen.getByText('Arguments')).toBeInTheDocument();
    expect(screen.getByText('Result')).toBeInTheDocument();
  });

  it('renders the tool call ID when present', () => {
    render(<GenAITab span={makeSpan([{ key: 'gen_ai.tool.call.id', value: 'call_1' }])} />);
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('call_1')).toBeInTheDocument();
  });

  it('parses tool call arguments given as a JSON-encoded string into the interactive tree, not raw text', () => {
    const { container } = render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.tool.name', value: 'get_weather' },
          { key: 'gen_ai.tool.call.arguments', value: JSON.stringify({ city: 'NYC' }) },
        ])}
      />
    );
    expect(container.querySelector('.json-markup-key')?.textContent).toContain('city');
    expect(container.querySelector('.json-markup-string')?.textContent).toBe('"NYC"');
  });

  it('renders tool call arguments that fail to parse as JSON as plain text, not a crash', () => {
    render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.tool.name', value: 'get_weather' },
          { key: 'gen_ai.tool.call.arguments', value: 'not valid json' },
        ])}
      />
    );
    expect(screen.getByText('not valid json')).toBeInTheDocument();
  });

  it('shows an empty state when the span has no gen_ai attributes', () => {
    render(<GenAITab span={makeSpan([{ key: 'http.method', value: 'GET' }])} />);
    expect(screen.getByText('No GenAI-specific attributes found on this span.')).toBeInTheDocument();
  });

  it('shows unhandled gen_ai attributes in a collapsed accordion instead of the empty state', () => {
    render(<GenAITab span={makeSpan([{ key: 'gen_ai.operation.name', value: 'chat' }])} />);
    expect(
      screen.getByText((_, element) => element?.textContent === 'Other GenAI Attributes:')
    ).toBeInTheDocument();
    expect(screen.getByText('gen_ai.operation.name')).toBeInTheDocument();
    expect(screen.queryByText('No GenAI-specific attributes found on this span.')).not.toBeInTheDocument();
  });

  it('expands the Other GenAI Attributes accordion on click', () => {
    render(<GenAITab span={makeSpan([{ key: 'gen_ai.operation.name', value: 'chat' }])} />);
    const header = screen.getByText((_, element) => element?.textContent === 'Other GenAI Attributes:');
    fireEvent.click(header);
    expect(screen.getByText('chat')).toBeInTheDocument();
  });
});

describe('GenAITab defensive fallback for an unrecognized section type', () => {
  // extractGenAiSections can never actually produce a section type outside
  // GenAiSection today - this is defensive code for if that invariant is
  // ever broken (e.g. a new section type added to the registry without a
  // matching case in the dispatcher). Force that path via vi.doMock (unlike
  // vi.mock, not hoisted module-wide) scoped to just this test, combined with
  // resetModules + a dynamic import so the rest of the file keeps using the
  // real extractor.
  afterEach(() => {
    vi.doUnmock('./genAiData');
    vi.resetModules();
  });

  it('renders a generic key/value dump instead of nothing for an unrecognized section type', async () => {
    vi.resetModules();
    vi.doMock('./genAiData', async () => {
      const actual = await vi.importActual<typeof import('./genAiData')>('./genAiData');
      return {
        ...actual,
        extractGenAiSections: vi.fn(() => [{ type: 'futureSectionType', data: { someField: 'someValue' } }]),
      };
    });
    const { default: GenAITabWithMock } = await import('.');
    render(<GenAITabWithMock span={makeSpan([])} />);
    expect(screen.getByText('futureSectionType')).toBeInTheDocument();
    expect(screen.getByText('someField')).toBeInTheDocument();
  });
});
