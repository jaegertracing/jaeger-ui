// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { extractGenAiData, hasAnyTokenUsage, formatTokenCount } from './genAiData';
import type { IAttribute } from '../../../../../types/otel';

function attrs(pairs: Record<string, unknown>): IAttribute[] {
  return Object.entries(pairs).map(([key, value]) => ({ key, value }) as IAttribute);
}

describe('extractGenAiData', () => {
  it('prefers current attribute names over deprecated ones', () => {
    const data = extractGenAiData(
      attrs({
        'gen_ai.provider.name': 'openai',
        'gen_ai.system': 'anthropic',
        'gen_ai.response.model': 'gpt-4o',
        'gen_ai.request.model': 'gpt-4o-mini',
      })
    );
    expect(data.provider).toBe('openai');
    expect(data.model).toBe('gpt-4o');
  });

  it('falls back to deprecated attribute names when current ones are absent', () => {
    const data = extractGenAiData(
      attrs({
        'gen_ai.system': 'anthropic',
        'gen_ai.request.model': 'claude-3-opus',
      })
    );
    expect(data.provider).toBe('anthropic');
    expect(data.model).toBe('claude-3-opus');
  });

  it('extracts all token usage categories including cache and reasoning tokens', () => {
    const data = extractGenAiData(
      attrs({
        'gen_ai.usage.input_tokens': 100,
        'gen_ai.usage.output_tokens': 50,
        'gen_ai.usage.cache_read.input_tokens': 80,
        'gen_ai.usage.cache_creation.input_tokens': 20,
        'gen_ai.usage.reasoning.output_tokens': 30,
      })
    );
    expect(data.usage).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      cacheReadInputTokens: 80,
      cacheCreationInputTokens: 20,
      reasoningOutputTokens: 30,
    });
  });

  it('parses numeric-string token counts, and ignores non-numeric strings', () => {
    const data = extractGenAiData(
      attrs({
        'gen_ai.usage.input_tokens': '100',
        'gen_ai.usage.output_tokens': 'not a number',
      })
    );
    expect(data.usage.inputTokens).toBe(100);
    expect(data.usage.outputTokens).toBeUndefined();
  });

  it('stringifies a non-string, non-null model attribute value', () => {
    const data = extractGenAiData(attrs({ 'gen_ai.request.model': 12345 }));
    expect(data.model).toBe('12345');
  });

  it('parses input/output messages from the spec-defined {role, parts} shape', () => {
    const data = extractGenAiData(
      attrs({
        'gen_ai.input.messages': [
          { role: 'system', parts: [{ type: 'text', content: 'You are helpful.' }] },
          { role: 'user', parts: [{ type: 'text', content: 'Hi' }] },
        ],
      })
    );
    expect(data.inputMessages).toEqual([
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hi' },
    ]);
  });

  it('parses input/output messages given as JSON-encoded strings', () => {
    const data = extractGenAiData(
      attrs({
        'gen_ai.output.messages': JSON.stringify([
          { role: 'assistant', parts: [{ type: 'text', content: 'Hello!' }] },
        ]),
      })
    );
    expect(data.outputMessages).toEqual([{ role: 'assistant', content: 'Hello!' }]);
  });

  it('joins multiple parts within one message with a blank line', () => {
    const data = extractGenAiData(
      attrs({
        'gen_ai.input.messages': [
          {
            role: 'assistant',
            parts: [
              { type: 'text', content: 'Let me check that.' },
              { type: 'reasoning', content: 'The user wants X, so I should call Y.' },
            ],
          },
        ],
      })
    );
    expect(data.inputMessages[0].content).toBe('Let me check that.\n\nThe user wants X, so I should call Y.');
  });

  it('renders a tool_call part as a compact function-call string', () => {
    const data = extractGenAiData(
      attrs({
        'gen_ai.output.messages': [
          {
            role: 'assistant',
            parts: [
              {
                type: 'tool_call',
                id: 'call_1',
                name: 'get_weather',
                arguments: { city: 'Paris' },
              },
            ],
          },
        ],
      })
    );
    expect(data.outputMessages[0].content).toBe('→ get_weather({"city":"Paris"})');
  });

  it('renders a tool_call_response part with its response value', () => {
    const data = extractGenAiData(
      attrs({
        'gen_ai.input.messages': [
          {
            role: 'tool',
            parts: [{ type: 'tool_call_response', id: 'call_1', response: 'rainy, 57°F' }],
          },
        ],
      })
    );
    expect(data.inputMessages[0].content).toBe('← "rainy, 57°F"');
  });

  it('renders media parts (blob/file/uri) as a placeholder instead of dropping them', () => {
    const data = extractGenAiData(
      attrs({
        'gen_ai.input.messages': [
          {
            role: 'user',
            parts: [{ type: 'uri', modality: 'image', uri: 'gs://bucket/photo.png' }],
          },
        ],
      })
    );
    expect(data.inputMessages[0].content).toBe('[image attached]');
  });

  it('falls back to a JSON dump for unrecognized/future part types', () => {
    const data = extractGenAiData(
      attrs({
        'gen_ai.input.messages': [{ role: 'user', parts: [{ type: 'some_future_part', foo: 'bar' }] }],
      })
    );
    expect(data.inputMessages[0].content).toContain('some_future_part');
  });

  it('renders a server_tool_call_response part with its response value', () => {
    const data = extractGenAiData(
      attrs({
        'gen_ai.output.messages': [
          {
            role: 'assistant',
            parts: [{ type: 'server_tool_call_response', server_tool_call_response: { status: 'ok' } }],
          },
        ],
      })
    );
    expect(data.outputMessages[0].content).toBe('← {"status":"ok"}');
  });

  it('renders a tool_call part with no arguments as an empty call rather than "(undefined)"', () => {
    const data = extractGenAiData(
      attrs({
        'gen_ai.output.messages': [{ role: 'assistant', parts: [{ type: 'tool_call', name: 'ping' }] }],
      })
    );
    expect(data.outputMessages[0].content).toBe('→ ping({})');
  });

  it('drops an unrecognized role to undefined instead of trusting an arbitrary string', () => {
    const data = extractGenAiData(
      attrs({
        'gen_ai.input.messages': [{ role: 'developer', parts: [{ type: 'text', content: 'hi' }] }],
      })
    );
    expect(data.inputMessages[0].role).toBeUndefined();
  });

  it('treats a non-object entry in a messages array as a roleless message', () => {
    const data = extractGenAiData(attrs({ 'gen_ai.input.messages': ['just a string entry'] }));
    expect(data.inputMessages).toEqual([{ role: undefined, content: 'just a string entry' }]);
  });

  it('falls back to deprecated prompt/completion when input/output messages are absent', () => {
    const data = extractGenAiData(
      attrs({
        'gen_ai.prompt': JSON.stringify([{ role: 'user', content: 'legacy prompt' }]),
        'gen_ai.completion': JSON.stringify([{ role: 'assistant', content: 'legacy completion' }]),
      })
    );
    expect(data.inputMessages).toEqual([{ role: 'user', content: 'legacy prompt' }]);
    expect(data.outputMessages).toEqual([{ role: 'assistant', content: 'legacy completion' }]);
  });

  it('treats an unparseable message string as a single roleless message', () => {
    const data = extractGenAiData(attrs({ 'gen_ai.input.messages': 'not json' }));
    expect(data.inputMessages).toEqual([{ role: undefined, content: 'not json' }]);
  });

  it('parses system instructions from the spec-defined array of {type, content} parts', () => {
    const data = extractGenAiData(
      attrs({
        'gen_ai.system_instructions': [
          { type: 'text', content: 'You are a helpful assistant.' },
          { type: 'text', content: 'Always answer in French.' },
        ],
      })
    );
    expect(data.systemInstructions).toBe('You are a helpful assistant.\n\nAlways answer in French.');
  });

  it('parses system instructions given as a JSON-encoded string of the same array format', () => {
    const data = extractGenAiData(
      attrs({
        'gen_ai.system_instructions': JSON.stringify([{ type: 'text', content: 'Be concise.' }]),
      })
    );
    expect(data.systemInstructions).toBe('Be concise.');
  });

  it('falls back to the raw string for system instructions that are not JSON', () => {
    const data = extractGenAiData(attrs({ 'gen_ai.system_instructions': 'Be concise.' }));
    expect(data.systemInstructions).toBe('Be concise.');
  });

  it('returns undefined system instructions when the attribute is absent', () => {
    const data = extractGenAiData(attrs({ 'gen_ai.usage.input_tokens': 1 }));
    expect(data.systemInstructions).toBeUndefined();
  });

  it('stringifies non-string content on the deprecated flat {role, content} shape', () => {
    const data = extractGenAiData(
      attrs({
        'gen_ai.input.messages': [{ role: 'user', content: { foo: 'a', bar: 'b' } }],
      })
    );
    expect(data.inputMessages[0].role).toBe('user');
    expect(data.inputMessages[0].content).toContain('foo');
  });

  it('extracts a tool call when any tool attribute is present', () => {
    const data = extractGenAiData(
      attrs({
        'gen_ai.tool.name': 'get_weather',
        'gen_ai.tool.call.id': 'call_1',
        'gen_ai.tool.call.arguments': { city: 'NYC' },
        'gen_ai.tool.call.result': { tempF: 72 },
      })
    );
    expect(data.toolCall).toEqual({
      id: 'call_1',
      name: 'get_weather',
      arguments: { city: 'NYC' },
      result: { tempF: 72 },
    });
  });

  it('returns undefined tool call when no tool attributes are present', () => {
    const data = extractGenAiData(attrs({ 'gen_ai.usage.input_tokens': 10 }));
    expect(data.toolCall).toBeUndefined();
  });

  it('handles zero-value token counts correctly, not treating them as missing', () => {
    const data = extractGenAiData(
      attrs({
        'gen_ai.usage.input_tokens': 0,
        'gen_ai.usage.cache_read.input_tokens': 0,
      })
    );
    expect(data.usage.inputTokens).toBe(0);
    expect(data.usage.cacheReadInputTokens).toBe(0);
  });

  it('surfaces unhandled gen_ai.* attributes via otherAttributes', () => {
    const data = extractGenAiData(
      attrs({
        'gen_ai.operation.name': 'chat',
        'gen_ai.conversation.id': 'conv-1',
        'http.method': 'GET',
      })
    );
    expect(data.otherAttributes).toEqual([
      { key: 'gen_ai.operation.name', value: 'chat' },
      { key: 'gen_ai.conversation.id', value: 'conv-1' },
    ]);
  });

  it('excludes attributes already surfaced by named fields from otherAttributes', () => {
    const data = extractGenAiData(
      attrs({
        'gen_ai.provider.name': 'openai',
        'gen_ai.usage.input_tokens': 10,
      })
    );
    expect(data.otherAttributes).toEqual([]);
  });

  it('returns empty messages and no usage/tool data for a span with no gen_ai attributes', () => {
    const data = extractGenAiData(attrs({ 'http.method': 'GET' }));
    expect(data.inputMessages).toEqual([]);
    expect(data.outputMessages).toEqual([]);
    expect(data.toolCall).toBeUndefined();
    expect(data.otherAttributes).toEqual([]);
    expect(hasAnyTokenUsage(data.usage)).toBe(false);
  });
});

describe('hasAnyTokenUsage', () => {
  it('returns true when at least one usage field is a number, including 0', () => {
    expect(hasAnyTokenUsage({ inputTokens: 0 })).toBe(true);
  });

  it('returns false when all fields are undefined', () => {
    expect(hasAnyTokenUsage({})).toBe(false);
  });
});

describe('formatTokenCount', () => {
  it('formats large numbers with thousands separators', () => {
    expect(formatTokenCount(1234567)).toBe('1,234,567');
  });

  it('formats zero correctly rather than treating it as falsy', () => {
    expect(formatTokenCount(0)).toBe('0');
  });

  it('returns undefined for undefined input', () => {
    expect(formatTokenCount(undefined)).toBeUndefined();
  });
});
