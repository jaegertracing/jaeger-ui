// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import AccordionGenAIAttributes, { GENAI_RICH_ATTRIBUTE_KEYS } from './AccordionGenAIAttributes';

vi.mock('react-json-view-lite', () => ({
  JsonView: ({ data }) => <div data-testid="json-view">{JSON.stringify(data)}</div>,
  collapseAllNested: () => false,
  defaultStyles: {},
}));

describe('GENAI_RICH_ATTRIBUTE_KEYS', () => {
  it('contains all expected OTel GenAI keys', () => {
    expect(GENAI_RICH_ATTRIBUTE_KEYS.has('gen_ai.input.messages')).toBe(true);
    expect(GENAI_RICH_ATTRIBUTE_KEYS.has('gen_ai.output.messages')).toBe(true);
    expect(GENAI_RICH_ATTRIBUTE_KEYS.has('gen_ai.tool.call.arguments')).toBe(true);
    expect(GENAI_RICH_ATTRIBUTE_KEYS.has('gen_ai.tool.call.result')).toBe(true);
    expect(GENAI_RICH_ATTRIBUTE_KEYS.has('gen_ai.retrieval.documents')).toBe(true);
    expect(GENAI_RICH_ATTRIBUTE_KEYS.has('gen_ai.tool.definitions')).toBe(true);
    expect(GENAI_RICH_ATTRIBUTE_KEYS.has('gen_ai.system_instructions')).toBe(true);
  });

  it('does not contain regular attribute keys', () => {
    expect(GENAI_RICH_ATTRIBUTE_KEYS.has('http.method')).toBe(false);
    expect(GENAI_RICH_ATTRIBUTE_KEYS.has('db.statement')).toBe(false);
    expect(GENAI_RICH_ATTRIBUTE_KEYS.has('gen_ai.system')).toBe(false);
  });
});

describe('<AccordionGenAIAttributes>', () => {
  const jsonPayload = JSON.stringify([{ role: 'user', content: 'Hello' }]);

  const singleAttr = [{ key: 'gen_ai.input.messages', value: jsonPayload }];

  it('returns null for empty data', () => {
    const { container } = render(<AccordionGenAIAttributes data={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the attribute key in the header', () => {
    render(<AccordionGenAIAttributes data={singleAttr} />);
    expect(screen.getByText('gen_ai.input.messages')).toBeInTheDocument();
  });

  it('shows a value preview before the accordion is opened', () => {
    render(<AccordionGenAIAttributes data={singleAttr} />);
    // preview should contain the start of the stringified JSON
    expect(screen.getByText(/^\[/)).toBeInTheDocument();
  });

  it('does not render the JSON tree before opening', () => {
    render(<AccordionGenAIAttributes data={singleAttr} />);
    expect(screen.queryByTestId('json-view')).not.toBeInTheDocument();
  });

  it('renders the JSON tree after clicking the toggle', () => {
    render(<AccordionGenAIAttributes data={singleAttr} />);
    const toggle = screen.getByTestId('genai-attr-toggle-gen_ai.input.messages');
    fireEvent.click(toggle);
    expect(screen.getByTestId('json-view')).toBeInTheDocument();
  });

  it('hides the JSON tree again when toggled a second time', () => {
    render(<AccordionGenAIAttributes data={singleAttr} />);
    const toggle = screen.getByTestId('genai-attr-toggle-gen_ai.input.messages');
    fireEvent.click(toggle);
    expect(screen.getByTestId('json-view')).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByTestId('json-view')).not.toBeInTheDocument();
  });

  it('renders raw string fallback for invalid JSON', () => {
    const badAttr = [{ key: 'gen_ai.tool.call.arguments', value: 'not valid json' }];
    render(<AccordionGenAIAttributes data={badAttr} />);
    const toggle = screen.getByTestId('genai-attr-toggle-gen_ai.tool.call.arguments');
    fireEvent.click(toggle);
    expect(screen.queryByTestId('json-view')).not.toBeInTheDocument();
    const body = screen.getByTestId('genai-attr-body-gen_ai.tool.call.arguments');
    expect(body).toHaveTextContent('not valid json');
  });

  it('renders multiple attributes independently', () => {
    const multiAttrs = [
      { key: 'gen_ai.input.messages', value: jsonPayload },
      { key: 'gen_ai.output.messages', value: jsonPayload },
    ];
    render(<AccordionGenAIAttributes data={multiAttrs} />);
    expect(screen.getByTestId('genai-attr-toggle-gen_ai.input.messages')).toBeInTheDocument();
    expect(screen.getByTestId('genai-attr-toggle-gen_ai.output.messages')).toBeInTheDocument();
  });

  it('opens each accordion independently', () => {
    const multiAttrs = [
      { key: 'gen_ai.input.messages', value: jsonPayload },
      { key: 'gen_ai.output.messages', value: jsonPayload },
    ];
    render(<AccordionGenAIAttributes data={multiAttrs} />);
    fireEvent.click(screen.getByTestId('genai-attr-toggle-gen_ai.input.messages'));
    expect(screen.getByTestId('genai-attr-body-gen_ai.input.messages')).toBeInTheDocument();
    expect(screen.queryByTestId('genai-attr-body-gen_ai.output.messages')).not.toBeInTheDocument();
  });

  it('renders non-string attribute values that are objects directly', () => {
    const objAttr = [{ key: 'gen_ai.tool.call.arguments', value: { x: 1 } }];
    render(<AccordionGenAIAttributes data={objAttr} />);
    const toggle = screen.getByTestId('genai-attr-toggle-gen_ai.tool.call.arguments');
    fireEvent.click(toggle);
    expect(screen.getByTestId('json-view')).toBeInTheDocument();
  });
});
