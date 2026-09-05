// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
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

// The view control is an antd Select, so it shows the chosen view as text rather than
// carrying it as a form value, and choosing one means opening the list and clicking an
// item. These read and drive it the way a reader would.
function viewControl(scope: { getByLabelText: typeof screen.getByLabelText } = screen): HTMLElement {
  return scope.getByLabelText(/Content format/);
}

function shownView(control: HTMLElement): string | null | undefined {
  return control.closest('.ant-select')?.querySelector('.ant-select-content')?.getAttribute('title');
}

function openViewList(control: HTMLElement): void {
  fireEvent.mouseDown(control);
}

// The item for one view in the list this control just opened. Every control's list is
// portaled to the body and stays there once opened, so the newest match is this one's:
// reopening a control reuses its list, and opening another appends after it.
function viewItem(control: HTMLElement, label: string): HTMLElement {
  openViewList(control);
  const items = screen.getAllByTitle(label).filter(item => item.classList.contains('ant-select-item-option'));
  return items[items.length - 1];
}

function chooseView(control: HTMLElement, label: string): void {
  fireEvent.click(viewItem(control, label));
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

  it('captions the provider/model section "LLM" on an actual LLM call, using the shared accordion like Agent does (#4237, @yurishkuro review on #4244)', () => {
    render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.operation.name', value: 'chat' },
          { key: 'gen_ai.provider.name', value: 'openai' },
          { key: 'gen_ai.response.model', value: 'gpt-4o' },
        ])}
      />
    );
    // Open by default (primary content) - header shows the bare label, table is visible.
    expect(screen.getByText('LLM')).toBeInTheDocument();
    expect(screen.getByText('openai')).toBeInTheDocument();
    expect(screen.getByText('gpt-4o')).toBeInTheDocument();
    fireEvent.click(screen.getByText('LLM'));
    // Collapsed: label gains its trailing colon and the table is replaced by a
    // one-line key=value preview, same behavior as the Agent accordion.
    expect(screen.getByText('LLM:')).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === 'Provider=openai')).toBeInTheDocument();
  });

  it('captions the provider/model section "Model" instead of "LLM" on a non-LLM span that also reports a provider, without hiding the provider itself (Ansh review on #4244)', () => {
    render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.operation.name', value: 'invoke_agent' },
          { key: 'gen_ai.provider.name', value: 'anthropic' },
        ])}
      />
    );
    // classifySpan() resolves this to AGENT, not LLM_CALL - captioning it "LLM" would
    // misrepresent an agent invocation as an LLM call, per Ansh's review on #4244.
    expect(screen.queryByText('LLM')).not.toBeInTheDocument();
    expect(screen.queryByText('LLM:')).not.toBeInTheDocument();
    expect(screen.getByText('Model')).toBeInTheDocument();
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

  it('uses the shared accordion for Agent, collapsible like Other GenAI Attributes, per @yurishkuro review on #4244', () => {
    render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.agent.name', value: 'jaeger-gemini-sidecar' },
          { key: 'gen_ai.agent.version', value: '0.1.0' },
        ])}
      />
    );
    // Agent starts open (it's primary content, unlike Other GenAI Attributes) - the
    // expanded table's per-row copy button is a marker only the open table renders.
    expect(screen.getByText('jaeger-gemini-sidecar')).toBeInTheDocument();
    expect(screen.getAllByText('Copy').length).toBeGreaterThan(0);
    const header = screen.getByText('Agent');
    fireEvent.click(header);
    // Collapsed: full table gone (no more per-row copy buttons), but name-first
    // ordering still gives a high-signal one-line preview without expanding -
    // exactly what the review comment asked for.
    expect(screen.queryByText('Copy')).not.toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.textContent === 'Name=jaeger-gemini-sidecar')
    ).toBeInTheDocument();
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
    chooseView(screen.getByLabelText(/Content format/), 'Markdown');
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
    chooseView(screen.getByLabelText(/Content format/), 'Markdown');
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
    chooseView(screen.getByLabelText(/Content format/), 'Markdown');
    const content = container.querySelector('.GenAITab--messageContent');
    expect(content?.querySelector('pre code')).toHaveTextContent('const x = 1;');
  });

  it('offers the Markdown view for an oversized message instead of refusing it, parsing on request', () => {
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
    const select = screen.getByLabelText(/Content format/) as HTMLElement;
    chooseView(select, 'Markdown');

    // The view stays selected - the size defers the parse rather than denying the view.
    expect(shownView(select)).toBe('Markdown');
    expect(viewItem(select, 'Markdown')).not.toHaveAttribute('aria-disabled', 'true');
    expect(container.querySelector('.GenAITab--messageContent strong')).toBeNull();
    expect(screen.getByText('Content appears to be Markdown (150KB).')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show text' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show Markdown' }));

    expect(container.querySelector('.GenAITab--messageContent strong')).toHaveTextContent('bold');
  });

  it('drops an oversized message to plain text when the reader asks for the text instead', () => {
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
    chooseView(screen.getByLabelText(/Content format/), 'Markdown');

    fireEvent.click(screen.getByRole('button', { name: 'Show text' }));

    expect(shownView(screen.getByLabelText(/Content format/))).toBe('Plain text');
    expect(container.querySelector('.GenAITab--messageContent-plain')?.textContent).toBe(oversizedContent);
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
    expect(shownView(screen.getByLabelText(/Content format/))).toBe('JSON');
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
    expect(shownView(screen.getByLabelText(/Content format/))).toBe('JSON');
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
    expect(viewItem(viewControl(), 'JSON')).toHaveAttribute('aria-disabled', 'true');
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
    const [firstSelect, secondSelect] = screen.getAllByLabelText(/Content format/) as HTMLElement[];
    // The format preference is stored per attribute name, not per message - explicitly
    // selecting JSON on the first (valid-JSON) message sets that attribute-level
    // preference, which the second message also picks up despite its own content not
    // being JSON.
    chooseView(firstSelect, 'JSON');

    expect(shownView(secondSelect)).toBe('Plain text');
    expect(viewItem(secondSelect, 'JSON')).toHaveAttribute('aria-disabled', 'true');
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
    chooseView(screen.getByLabelText(/Content format/), 'Markdown');
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
    expect(shownView(screen.getByLabelText(/Content format/))).toBe('Markdown');
    expect(container.querySelector('.GenAITab--messageContent strong')).toBeInTheDocument();
  });

  it('changes only the message whose dropdown was used, leaving its neighbours alone', () => {
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

    chooseView(firstSelect, 'Markdown');

    expect(shownView(firstSelect)).toBe('Markdown');
    expect(shownView(secondSelect)).toBe('Plain text');
    expect(container.querySelectorAll('.GenAITab--messageContent strong')).toHaveLength(1);
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
    const outputSelect = outputBlock?.querySelector('.GenAITab--formatSelect') as HTMLElement;
    const inputSelect = inputBlock?.querySelector('.GenAITab--formatSelect') as HTMLElement;

    chooseView(outputSelect, 'Markdown');
    expect(shownView(inputSelect)).toBe('Plain text');
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

  it('renders a Retrieved documents section with its meta fields and one card per document (#4434)', () => {
    render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.operation.name', value: 'retrieval' },
          { key: 'gen_ai.data_source.id', value: 'weather-knowledge-base' },
          { key: 'gen_ai.retrieval.query.text', value: 'What is the weather in Seattle?' },
          { key: 'gen_ai.retrieval.top_k', value: 3 },
          {
            key: 'gen_ai.retrieval.documents',
            value: JSON.stringify([
              { content: 'Seattle weather is rainy and cool.', source_id: 'weather-knowledge-base' },
            ]),
          },
        ])}
      />
    );
    expect(screen.getByText('Retrieved documents')).toBeInTheDocument();
    expect(screen.getByText('What is the weather in Seattle?')).toBeInTheDocument();
    // "weather-knowledge-base" appears twice: as the data source and again as the
    // document's own source_id, which must still surface even though it duplicates it.
    expect(screen.getAllByText('weather-knowledge-base')).toHaveLength(2);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Document 1')).toBeInTheDocument();
    expect(screen.getByText('Seattle weather is rainy and cool.')).toBeInTheDocument();
    // source_id isn't a field the renderer fixes in advance - it must still surface.
    expect(screen.getByText('source_id')).toBeInTheDocument();
  });

  it('does not hide retrieval documents behind Other GenAI Attributes (#4434)', () => {
    render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.retrieval.documents', value: [{ content: 'doc one' }, { content: 'doc two' }] },
        ])}
      />
    );
    expect(screen.getByText('Document 1')).toBeInTheDocument();
    expect(screen.getByText('doc one')).toBeInTheDocument();
    expect(screen.getByText('Document 2')).toBeInTheDocument();
    expect(screen.getByText('doc two')).toBeInTheDocument();
    expect(screen.queryByText('Other GenAI Attributes')).not.toBeInTheDocument();
  });

  it('renders a Memory section with its meta fields and one card per record (#4434)', () => {
    render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.operation.name', value: 'search_memory' },
          { key: 'gen_ai.memory.store.id', value: 'memory-store-1' },
          { key: 'gen_ai.memory.query.text', value: "What are the user's food preferences?" },
          { key: 'gen_ai.memory.record.count', value: 1 },
          {
            key: 'gen_ai.memory.records',
            value: JSON.stringify([
              {
                content: 'User prefers vegetarian meals and dark mode.',
                id: '90f1f094',
                metadata: { author: 'user' },
              },
            ]),
          },
        ])}
      />
    );
    expect(screen.getByText('Memory')).toBeInTheDocument();
    expect(screen.getByText('memory-store-1')).toBeInTheDocument();
    expect(screen.getByText("What are the user's food preferences?")).toBeInTheDocument();
    expect(screen.getByText('Record 1')).toBeInTheDocument();
    expect(screen.getByText('User prefers vegetarian meals and dark mode.')).toBeInTheDocument();
    // metadata isn't a field the renderer fixes in advance - it must still surface.
    expect(screen.getByText('metadata')).toBeInTheDocument();
  });

  it('shows an empty state when the span has no gen_ai attributes', () => {
    render(<GenAITab span={makeSpan([{ key: 'http.method', value: 'GET' }])} />);
    expect(screen.getByText('No GenAI-specific attributes found on this span.')).toBeInTheDocument();
  });

  it('auto-expands Other GenAI Attributes when it is the only section', () => {
    render(<GenAITab span={makeSpan([{ key: 'gen_ai.conversation.id', value: 'conv-1' }])} />);
    expect(screen.getByText('Other GenAI Attributes').closest('[role="switch"]')).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByText('gen_ai.conversation.id')).toBeInTheDocument();
    expect(screen.getByText('conv-1')).toBeInTheDocument();
    expect(screen.queryByText('No GenAI-specific attributes found on this span.')).not.toBeInTheDocument();
  });

  it('keeps Other GenAI Attributes collapsed when another section is present and expands it on click', () => {
    render(
      <GenAITab
        span={makeSpan([
          { key: 'gen_ai.provider.name', value: 'openai' },
          { key: 'gen_ai.conversation.id', value: 'conv-1' },
        ])}
      />
    );
    const header = screen.getByText((_, element) => element?.textContent === 'Other GenAI Attributes:');
    expect(header.closest('[role="switch"]')).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(header);
    expect(screen.getByText('Other GenAI Attributes').closest('[role="switch"]')).toHaveAttribute(
      'aria-checked',
      'true'
    );
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

describe('GenAITab message collapsing', () => {
  beforeEach(() => {
    localStorage.clear();
    useMessageFormatStore.setState({ overrides: {} });
  });

  function renderConversation() {
    return render(
      <GenAITab
        span={makeSpan([
          {
            key: 'gen_ai.output.messages',
            value: [
              { role: 'assistant', content: 'First message, long enough to be worth folding.' },
              { role: 'assistant', content: 'Second message.' },
            ],
          },
        ])}
      />
    );
  }

  it('starts expanded, showing the content rather than a preview', () => {
    const { container } = renderConversation();
    expect(container.querySelector('.GenAITab--messagePreview')).toBeNull();
    expect(screen.getAllByRole('button', { expanded: true })).toHaveLength(2);
  });

  it('folds a message to a single identifiable line when collapsed', () => {
    const { container } = renderConversation();
    const messages = container.querySelectorAll('.GenAITab--message');

    fireEvent.click(within(messages[0] as HTMLElement).getByRole('button', { expanded: true }));

    expect(messages[0].querySelector('.GenAITab--messageContent-plain')).toBeNull();
    expect(messages[0].querySelector('.GenAITab--messagePreview')?.textContent).toBe(
      'First message, long enough to be worth folding.'
    );
    // The role stays legible, so a folded message is still placed in the conversation.
    expect(within(messages[0] as HTMLElement).getByText('assistant')).toBeInTheDocument();
  });

  it('collapses only the message whose toggle was used', () => {
    const { container } = renderConversation();
    const messages = container.querySelectorAll('.GenAITab--message');

    fireEvent.click(within(messages[0] as HTMLElement).getByRole('button', { expanded: true }));

    expect(messages[1].querySelector('.GenAITab--messageContent-plain')?.textContent).toBe('Second message.');
    expect(messages[1].querySelector('.GenAITab--messagePreview')).toBeNull();
  });

  it('expands a collapsed message again, restoring the chosen format', () => {
    const { container } = renderConversation();
    const message = container.querySelector('.GenAITab--message') as HTMLElement;
    chooseView(within(message).getByLabelText(/Content format/), 'Markdown');

    fireEvent.click(within(message).getByRole('button', { expanded: true }));
    fireEvent.click(within(message).getByRole('button', { expanded: false }));

    expect(message.querySelector('.GenAITab--messagePreview')).toBeNull();
    expect(shownView(within(message).getByLabelText(/Content format/))).toBe('Markdown');
  });
});

describe('GenAITab media rendering', () => {
  const DATA_URI = 'data:image/png;base64,iVBORw0KGgo=';

  beforeEach(() => {
    localStorage.clear();
    useMessageFormatStore.setState({ overrides: {} });
  });

  function renderMessage(content: string) {
    return render(
      <GenAITab
        span={makeSpan([{ key: 'gen_ai.output.messages', value: [{ role: 'assistant', content }] }])}
      />
    );
  }

  it('offers a remote image link instead of fetching it, and shows where it points', () => {
    const url = 'https://example.com/chart.png';
    const { container } = renderMessage(url);
    expect(shownView(screen.getByLabelText(/Content format/))).toBe('Image');
    expect(screen.getByText('Image link (maybe):')).toBeInTheDocument();
    expect(container.querySelector('img.GenAITab--media')).toBeNull();
    expect(screen.getByRole('button', { name: 'Show image' })).toBeInTheDocument();
    // The value is elided by CSS rather than cut down, so the full URL is in the DOM and
    // in the tooltip while only one line of it is on screen.
    expect(container.querySelector('.GenAITab--revealValue')).toHaveAttribute('title', url);
  });

  it('explains the view it chose on the control itself, without claiming certainty', async () => {
    renderMessage('https://example.com/chart.png');

    fireEvent.mouseOver(viewControl());

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Image (maybe): recognized from the value alone'
    );
  });

  it('explains a view on its item in the list too', async () => {
    renderMessage('Just a sentence about a cat.png file.');

    fireEvent.mouseOver(
      viewItem(viewControl(), 'Image').querySelector('.GenAITab--formatOption') as HTMLElement
    );

    expect(await screen.findByRole('tooltip')).toHaveTextContent('This part carries no image to show');
  });

  it('renders the image with alt text and a no-referrer policy once the user asks for it', () => {
    const url = 'https://example.com/chart.png';
    const { container } = renderMessage(url);

    fireEvent.click(screen.getByRole('button', { name: 'Show image' }));

    const img = container.querySelector('img.GenAITab--media') as HTMLImageElement | null;
    expect(img?.getAttribute('src')).toBe(url);
    expect(img?.getAttribute('alt')).toBe('Image in message 1 (assistant)');
    expect(img?.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(container.querySelectorAll('.GenAITab--revealButton')).toHaveLength(0);
  });

  it('waits for a click before rendering a remote audio player, then gives it controls', () => {
    const { container } = renderMessage('https://example.com/reply.mp3');
    expect(screen.getByText('Audio clip link (maybe):')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show audio clip' }));

    const audio = container.querySelector('audio.GenAITab--media');
    expect(audio?.hasAttribute('controls')).toBe(true);
    expect(audio?.getAttribute('aria-label')).toBe('Audio in message 1 (assistant)');
  });

  it('renders an embedded payload immediately, since showing it requests nothing', () => {
    const { container } = renderMessage(DATA_URI);
    expect(container.querySelector('img.GenAITab--media')?.getAttribute('src')).toBe(DATA_URI);
    expect(container.querySelectorAll('.GenAITab--revealButton')).toHaveLength(0);
  });

  it('keeps a data URI out of the Media view, where Plain text shows it in full', () => {
    const { container } = renderMessage(DATA_URI);
    expect(container.querySelector('.GenAITab--messageContent-plain')).toBeNull();

    chooseView(screen.getByLabelText(/Content format/), 'Plain text');

    expect(container.querySelector('.GenAITab--messageContent-plain')?.textContent).toBe(DATA_URI);
  });

  it('switches this message to Plain text when the reader asks for the text instead', () => {
    const url = 'https://example.com/chart.png';
    const { container } = renderMessage(url);

    fireEvent.click(screen.getByRole('button', { name: 'Show text' }));

    expect(shownView(screen.getByLabelText(/Content format/))).toBe('Plain text');
    expect(container.querySelector('.GenAITab--messageContent-plain')?.textContent).toBe(url);
  });

  it('remembers a link it already showed, so a trip through Plain text and back does not ask again', () => {
    const { container } = renderMessage('https://example.com/chart.png');
    fireEvent.click(screen.getByRole('button', { name: 'Show image' }));
    const select = screen.getByLabelText(/Content format/);

    chooseView(select, 'Plain text');
    chooseView(select, 'Image');

    expect(container.querySelector('img.GenAITab--media')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Show image' })).toBeNull();
  });

  it('leaves both media options disabled for a value that is not a media link', () => {
    const { container } = renderMessage('Just a sentence about a cat.png file.');
    expect(shownView(screen.getByLabelText(/Content format/))).toBe('Plain text');
    const control = viewControl();
    expect(viewItem(control, 'Image')).toHaveAttribute('aria-disabled', 'true');
    expect(viewItem(control, 'Audio')).toHaveAttribute('aria-disabled', 'true');
    expect(container.querySelector('.GenAITab--media')).toBeNull();
  });

  it('reports a load failure in place, offering the text as the way on', () => {
    const { container } = renderMessage('https://example.com/broken.png');
    fireEvent.click(screen.getByRole('button', { name: 'Show image' }));

    fireEvent.error(container.querySelector('img.GenAITab--media') as HTMLImageElement);

    expect(container.querySelector('img.GenAITab--media')).toBeNull();
    expect(screen.getByText('Image could not be loaded:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show text' })).toBeInTheDocument();
  });

  it('does not load a different remote link that reuses the same position', () => {
    // Messages are keyed by position (output-0), so new content arrives at the same
    // component instance. A reader who chose to load one URL has not consented to
    // whatever replaces it, so the offer must come back.
    const { container, rerender } = render(
      <GenAITab
        span={makeSpan([
          {
            key: 'gen_ai.output.messages',
            value: [{ role: 'assistant', content: 'https://example.com/first.png' }],
          },
        ])}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show image' }));
    expect(container.querySelector('img.GenAITab--media')).not.toBeNull();

    rerender(
      <GenAITab
        span={makeSpan([
          {
            key: 'gen_ai.output.messages',
            value: [{ role: 'assistant', content: 'https://example.com/second.png' }],
          },
        ])}
      />
    );

    expect(container.querySelector('img.GenAITab--media')).toBeNull();
    expect(screen.getByRole('button', { name: 'Show image' })).toBeInTheDocument();
  });
});
