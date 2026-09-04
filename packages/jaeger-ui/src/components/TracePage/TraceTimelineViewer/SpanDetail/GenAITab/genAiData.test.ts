// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import {
  extractGenAiSections,
  hasAnyTokenUsage,
  formatTokenCount,
  tryParseJson,
  GenAiSection,
} from './genAiData';
import type { IAttribute, IAttributes } from '../../../../../types/otel';
import { makeAttributes } from '../../../../../model/attributes';

function attrs(pairs: Record<string, unknown>): IAttributes {
  return makeAttributes(Object.entries(pairs).map(([key, value]) => ({ key, value }) as IAttribute));
}

type SectionDataMap = { [S in GenAiSection as S['type']]: S['data'] };

// These tests assert role and text; the parts array is asserted where parts are the point.
function roleAndText(messages: { role: unknown; content: string }[] | undefined) {
  return (messages ?? []).map(({ role, content }) => ({ role, content }));
}

function section<T extends keyof SectionDataMap>(
  sections: GenAiSection[],
  type: T
): SectionDataMap[T] | undefined {
  return sections.find(s => s.type === type)?.data as SectionDataMap[T] | undefined;
}

describe('extractGenAiSections', () => {
  describe('agent section', () => {
    it('extracts all four gen_ai.agent.* fields', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.agent.id': 'asst_5j66UpCpwteGg4YSxUnt7lPY',
          'gen_ai.agent.name': 'Math Tutor',
          'gen_ai.agent.version': '1.0.0',
          'gen_ai.agent.description': 'Helps with math problems',
        })
      );
      expect(section(sections, 'agent')).toEqual({
        id: 'asst_5j66UpCpwteGg4YSxUnt7lPY',
        name: 'Math Tutor',
        version: '1.0.0',
        description: 'Helps with math problems',
      });
    });

    it('extracts an agent section from gen_ai.agent.name alone', () => {
      const sections = extractGenAiSections(attrs({ 'gen_ai.agent.name': 'Math Tutor' }));
      expect(section(sections, 'agent')).toEqual({
        id: undefined,
        name: 'Math Tutor',
        version: undefined,
        description: undefined,
      });
    });

    it('produces no agent section when no gen_ai.agent.* attribute is present', () => {
      const sections = extractGenAiSections(attrs({ 'gen_ai.provider.name': 'openai' }));
      expect(section(sections, 'agent')).toBeUndefined();
    });

    it('excludes claimed gen_ai.agent.* attributes from the other section', () => {
      const sections = extractGenAiSections(
        attrs({ 'gen_ai.agent.name': 'Math Tutor', 'gen_ai.conversation.id': 'conv-1' })
      );
      expect(section(sections, 'other')?.attributes.entries()).toEqual([
        { key: 'gen_ai.conversation.id', value: 'conv-1' },
      ]);
    });

    it('still produces an agent section for a legitimate empty-string field, instead of silently dropping it', () => {
      const sections = extractGenAiSections(attrs({ 'gen_ai.agent.name': '' }));
      expect(section(sections, 'agent')).toEqual({
        id: undefined,
        name: '',
        version: undefined,
        description: undefined,
      });
      expect(section(sections, 'other')).toBeUndefined();
    });
  });

  describe('meta section (provider/model)', () => {
    it('prefers current provider attribute names over deprecated one when they disagree', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.provider.name': 'openai',
          'gen_ai.system': 'anthropic',
          'gen_ai.response.model': 'gpt-4o',
        })
      );
      expect(section(sections, 'meta')).toEqual({ provider: 'openai', model: 'gpt-4o' });
    });

    it('falls back to deprecated attribute names when current ones are absent', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.system': 'anthropic',
          'gen_ai.request.model': 'claude-3-opus',
        })
      );
      expect(section(sections, 'meta')).toEqual({ provider: 'anthropic', model: 'claude-3-opus' });
    });

    it('stringifies a non-string, non-null model attribute value', () => {
      const sections = extractGenAiSections(attrs({ 'gen_ai.request.model': 12345 }));
      expect(section(sections, 'meta')?.model).toBe('12345');
    });

    it('shows both request and response model when they differ, since they record different things per spec', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.request.model': 'gpt-4',
          'gen_ai.response.model': 'gpt-4-0613',
        })
      );
      expect(section(sections, 'meta')?.model).toBe('gpt-4-0613 (requested: gpt-4)');
    });

    it('shows a single model value when request and response model agree', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.request.model': 'gpt-4o',
          'gen_ai.response.model': 'gpt-4o',
        })
      );
      expect(section(sections, 'meta')?.model).toBe('gpt-4o');
    });

    it('produces no meta section when neither provider nor model is present', () => {
      const sections = extractGenAiSections(attrs({ 'gen_ai.usage.input_tokens': 1 }));
      expect(section(sections, 'meta')).toBeUndefined();
    });
  });

  describe('tokens section', () => {
    it('extracts all token usage categories including cache and reasoning tokens', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.usage.input_tokens': 100,
          'gen_ai.usage.output_tokens': 50,
          'gen_ai.usage.cache_read.input_tokens': 80,
          'gen_ai.usage.cache_creation.input_tokens': 20,
          'gen_ai.usage.reasoning.output_tokens': 30,
        })
      );
      expect(section(sections, 'tokens')).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        cacheReadInputTokens: 80,
        cacheCreationInputTokens: 20,
        reasoningOutputTokens: 30,
      });
    });

    it('parses numeric-string token counts, and ignores non-numeric strings', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.usage.input_tokens': '100',
          'gen_ai.usage.output_tokens': 'not a number',
        })
      );
      expect(section(sections, 'tokens')?.inputTokens).toBe(100);
      expect(section(sections, 'tokens')?.outputTokens).toBeUndefined();
    });

    it('handles zero-value token counts correctly, not treating them as missing', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.usage.input_tokens': 0,
          'gen_ai.usage.cache_read.input_tokens': 0,
        })
      );
      expect(section(sections, 'tokens')?.inputTokens).toBe(0);
      expect(section(sections, 'tokens')?.cacheReadInputTokens).toBe(0);
    });

    it('produces no tokens section when no usage attributes are present', () => {
      const sections = extractGenAiSections(attrs({ 'gen_ai.provider.name': 'openai' }));
      expect(section(sections, 'tokens')).toBeUndefined();
    });
  });

  describe('conversation section - messages', () => {
    it('parses input/output messages from the spec-defined {role, parts} shape', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.input.messages': [
            { role: 'system', parts: [{ type: 'text', content: 'You are helpful.' }] },
            { role: 'user', parts: [{ type: 'text', content: 'Hi' }] },
          ],
        })
      );
      expect(roleAndText(section(sections, 'conversation')?.inputMessages)).toEqual([
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Hi' },
      ]);
    });

    it('parses input/output messages given as JSON-encoded strings', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.output.messages': JSON.stringify([
            { role: 'assistant', parts: [{ type: 'text', content: 'Hello!' }] },
          ]),
        })
      );
      expect(roleAndText(section(sections, 'conversation')?.outputMessages)).toEqual([
        { role: 'assistant', content: 'Hello!' },
      ]);
    });

    it('joins multiple parts within one message with a blank line', () => {
      const sections = extractGenAiSections(
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
      expect(section(sections, 'conversation')?.inputMessages[0].content).toBe(
        'Let me check that.\n\nThe user wants X, so I should call Y.'
      );
    });

    it('renders a tool_call part as a compact function-call string', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.output.messages': [
            {
              role: 'assistant',
              parts: [{ type: 'tool_call', id: 'call_1', name: 'get_weather', arguments: { city: 'Paris' } }],
            },
          ],
        })
      );
      expect(section(sections, 'conversation')?.outputMessages[0].content).toBe(
        '→ get_weather({"city":"Paris"})'
      );
    });

    it('renders a tool_call_response part with a plain-string response unquoted', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.input.messages': [
            { role: 'tool', parts: [{ type: 'tool_call_response', id: 'call_1', response: 'rainy, 57°F' }] },
          ],
        })
      );
      expect(section(sections, 'conversation')?.inputMessages[0].content).toBe('← rainy, 57°F');
    });

    it('renders a tool_call_response part with a JSON-encoded string response parsed, not double-encoded', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.input.messages': [
            {
              role: 'tool',
              parts: [{ type: 'tool_call_response', id: 'call_1', response: JSON.stringify({ tempF: 57 }) }],
            },
          ],
        })
      );
      expect(section(sections, 'conversation')?.inputMessages[0].content).toBe('← {"tempF":57}');
    });

    it('shows a uri part whose scheme no browser can fetch, rather than hiding it', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.input.messages': [
            { role: 'user', parts: [{ type: 'uri', modality: 'image', uri: 'gs://bucket/photo.png' }] },
          ],
        })
      );
      // detectMediaType will decline this, so it renders as text - which is the whole
      // value, and more than the reader had when it read "[image attached]".
      expect(section(sections, 'conversation')?.inputMessages[0].content).toBe('gs://bucket/photo.png');
    });

    it('shows a uri part as its URI, so a media view can offer to render it', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.output.messages': [
            {
              role: 'assistant',
              parts: [
                {
                  type: 'uri',
                  modality: 'image',
                  mime_type: 'image/png',
                  uri: 'https://example.com/chart.png',
                },
              ],
            },
          ],
        })
      );
      expect(section(sections, 'conversation')?.outputMessages[0].content).toBe(
        'https://example.com/chart.png'
      );
    });

    it('shows a uri part among text parts too, not only when it stands alone', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.output.messages': [
            {
              role: 'assistant',
              parts: [
                { type: 'text', content: 'Here is the chart you asked for:' },
                { type: 'uri', modality: 'image', uri: 'https://example.com/chart.png' },
              ],
            },
          ],
        })
      );
      expect(section(sections, 'conversation')?.outputMessages[0].content).toBe(
        'Here is the chart you asked for:\n\nhttps://example.com/chart.png'
      );
    });

    it('shows a file part as its file_id, the reference a provider API takes', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.output.messages': [
            { role: 'assistant', parts: [{ type: 'file', modality: 'image', file_id: 'file_abc123' }] },
          ],
        })
      );
      expect(section(sections, 'conversation')?.outputMessages[0].content).toBe('image file file_abc123');
    });

    it('gives a blob part a data URI to render from, and text that describes it', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.output.messages': [
            {
              role: 'assistant',
              parts: [{ type: 'blob', modality: 'image', mime_type: 'image/png', content: 'iVBORw0KGgo=' }],
            },
          ],
        })
      );
      expect(section(sections, 'conversation')?.outputMessages[0].parts).toEqual([
        { text: 'image/png attachment, 8 B', src: 'data:image/png;base64,iVBORw0KGgo=' },
      ]);
    });

    it('keeps a blob and the text sharing its message as separate parts', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.output.messages': [
            {
              role: 'assistant',
              parts: [
                { type: 'text', content: 'Here is the chart you asked for:' },
                { type: 'blob', modality: 'image', mime_type: 'image/png', content: 'iVBORw0KGgo=' },
              ],
            },
          ],
        })
      );
      // Both survive: the text is not lost to the attachment, and the attachment still
      // has somewhere to render from.
      expect(section(sections, 'conversation')?.outputMessages[0].parts).toEqual([
        { text: 'Here is the chart you asked for:', src: undefined },
        { text: 'image/png attachment, 8 B', src: 'data:image/png;base64,iVBORw0KGgo=' },
      ]);
    });

    it('summarizes a blob with no mime type by its modality and size', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.output.messages': [
            { role: 'assistant', parts: [{ type: 'blob', modality: 'image', content: 'iVBORw0KGgo=' }] },
          ],
        })
      );
      // No mime_type means no data: URI to build, and "image" alone does not name a type.
      expect(section(sections, 'conversation')?.outputMessages[0].content).toBe('image attachment, 8 B');
    });

    it('summarizes a blob sharing a message with text, rather than burying the text in base64', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.output.messages': [
            {
              role: 'assistant',
              parts: [
                { type: 'text', content: 'Here is the chart you asked for:' },
                { type: 'blob', modality: 'image', mime_type: 'image/png', content: 'a'.repeat(60000) },
              ],
            },
          ],
        })
      );
      expect(section(sections, 'conversation')?.outputMessages[0].content).toBe(
        'Here is the chart you asked for:\n\nimage/png attachment, 44 KB'
      );
    });

    it('falls back to a JSON dump for unrecognized/future part types', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.input.messages': [{ role: 'user', parts: [{ type: 'some_future_part', foo: 'bar' }] }],
        })
      );
      expect(section(sections, 'conversation')?.inputMessages[0].content).toContain('some_future_part');
    });

    it('renders a server_tool_call_response part with its response value', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.output.messages': [
            {
              role: 'assistant',
              parts: [{ type: 'server_tool_call_response', server_tool_call_response: { status: 'ok' } }],
            },
          ],
        })
      );
      expect(section(sections, 'conversation')?.outputMessages[0].content).toBe('← {"status":"ok"}');
    });

    it('renders a tool_call part with no arguments as an empty call rather than "(undefined)"', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.output.messages': [{ role: 'assistant', parts: [{ type: 'tool_call', name: 'ping' }] }],
        })
      );
      expect(section(sections, 'conversation')?.outputMessages[0].content).toBe('→ ping({})');
    });

    it('parses string-encoded tool_call arguments instead of double-encoding them', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.output.messages': [
            {
              role: 'assistant',
              parts: [
                { type: 'tool_call', name: 'get_weather', arguments: JSON.stringify({ city: 'Paris' }) },
              ],
            },
          ],
        })
      );
      expect(section(sections, 'conversation')?.outputMessages[0].content).toBe(
        '→ get_weather({"city":"Paris"})'
      );
    });

    it('falls back to the raw string when tool_call arguments are a non-JSON string', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.output.messages': [
            { role: 'assistant', parts: [{ type: 'tool_call', name: 'get_weather', arguments: 'Paris' }] },
          ],
        })
      );
      expect(section(sections, 'conversation')?.outputMessages[0].content).toBe('→ get_weather(Paris)');
    });

    it('falls back to the raw string when tool_call arguments look like JSON but fail to parse', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.output.messages': [
            {
              role: 'assistant',
              parts: [{ type: 'tool_call', name: 'get_weather', arguments: '{not valid json' }],
            },
          ],
        })
      );
      expect(section(sections, 'conversation')?.outputMessages[0].content).toBe(
        '→ get_weather({not valid json)'
      );
    });

    it('reads server_tool_call args from the server_tool_call field, not arguments (per the OTel spec, this differs from tool_call by design)', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.output.messages': [
            {
              role: 'assistant',
              parts: [
                {
                  type: 'server_tool_call',
                  name: 'web_search',
                  server_tool_call: { query: 'weather in Paris' },
                },
              ],
            },
          ],
        })
      );
      expect(section(sections, 'conversation')?.outputMessages[0].content).toBe(
        '→ web_search({"query":"weather in Paris"})'
      );
    });

    it('falls back to String() instead of throwing when tool_call arguments are circular and cannot be JSON.stringify-d', () => {
      const circularArgs: Record<string, unknown> = {};
      circularArgs.self = circularArgs;
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.output.messages': [
            {
              role: 'assistant',
              parts: [{ type: 'tool_call', name: 'get_weather', arguments: circularArgs }],
            },
          ],
        })
      );
      expect(section(sections, 'conversation')?.outputMessages[0].content).toBe(
        `→ get_weather(${String(circularArgs)})`
      );
    });

    it('drops an unrecognized role to undefined instead of trusting an arbitrary string', () => {
      const sections = extractGenAiSections(
        attrs({ 'gen_ai.input.messages': [{ role: 'developer', parts: [{ type: 'text', content: 'hi' }] }] })
      );
      expect(section(sections, 'conversation')?.inputMessages[0].role).toBeUndefined();
    });

    it('treats a non-object entry in a messages array as a roleless message', () => {
      const sections = extractGenAiSections(attrs({ 'gen_ai.input.messages': ['just a string entry'] }));
      expect(roleAndText(section(sections, 'conversation')?.inputMessages)).toEqual([
        { role: undefined, content: 'just a string entry' },
      ]);
    });

    it('handles a single already-parsed message object that is not array-wrapped, instead of silently dropping it', () => {
      const sections = extractGenAiSections(
        attrs({ 'gen_ai.input.messages': { role: 'user', parts: [{ type: 'text', content: 'Hi' }] } })
      );
      expect(roleAndText(section(sections, 'conversation')?.inputMessages)).toEqual([
        { role: 'user', content: 'Hi' },
      ]);
    });

    it('falls back to deprecated prompt/completion when input/output messages are absent', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.prompt': JSON.stringify([{ role: 'user', content: 'legacy prompt' }]),
          'gen_ai.completion': JSON.stringify([{ role: 'assistant', content: 'legacy completion' }]),
        })
      );
      expect(roleAndText(section(sections, 'conversation')?.inputMessages)).toEqual([
        { role: 'user', content: 'legacy prompt' },
      ]);
      expect(roleAndText(section(sections, 'conversation')?.outputMessages)).toEqual([
        { role: 'assistant', content: 'legacy completion' },
      ]);
    });

    it('treats an unparseable message string as a single roleless message', () => {
      const sections = extractGenAiSections(attrs({ 'gen_ai.input.messages': 'not json' }));
      expect(roleAndText(section(sections, 'conversation')?.inputMessages)).toEqual([
        { role: undefined, content: 'not json' },
      ]);
    });

    it('stringifies non-string content on the deprecated flat {role, content} shape', () => {
      const sections = extractGenAiSections(
        attrs({ 'gen_ai.input.messages': [{ role: 'user', content: { foo: 'a', bar: 'b' } }] })
      );
      const message = section(sections, 'conversation')?.inputMessages[0];
      expect(message?.role).toBe('user');
      expect(message?.content).toContain('foo');
    });

    it('produces no conversation section when there are no messages or system instructions', () => {
      const sections = extractGenAiSections(attrs({ 'gen_ai.usage.input_tokens': 1 }));
      expect(section(sections, 'conversation')).toBeUndefined();
    });
  });

  describe('conversation section - system instructions', () => {
    it('parses system instructions from the spec-defined array of {type, content} parts', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.system_instructions': [
            { type: 'text', content: 'You are a helpful assistant.' },
            { type: 'text', content: 'Always answer in French.' },
          ],
        })
      );
      expect(section(sections, 'conversation')?.systemInstructions).toBe(
        'You are a helpful assistant.\n\nAlways answer in French.'
      );
    });

    it('parses system instructions given as a JSON-encoded string of the same array format', () => {
      const sections = extractGenAiSections(
        attrs({ 'gen_ai.system_instructions': JSON.stringify([{ type: 'text', content: 'Be concise.' }]) })
      );
      expect(section(sections, 'conversation')?.systemInstructions).toBe('Be concise.');
    });

    it('handles a single system-instruction part object that is not array-wrapped, instead of silently dropping it', () => {
      const sections = extractGenAiSections(
        attrs({ 'gen_ai.system_instructions': { type: 'text', content: 'Be concise.' } })
      );
      expect(section(sections, 'conversation')?.systemInstructions).toBe('Be concise.');
    });

    it('falls back to the raw string for system instructions that are not JSON', () => {
      const sections = extractGenAiSections(attrs({ 'gen_ai.system_instructions': 'Be concise.' }));
      expect(section(sections, 'conversation')?.systemInstructions).toBe('Be concise.');
    });

    it("falls back to String() instead of throwing when a system-instruction part's content is circular and cannot be JSON.stringify-d", () => {
      const circularContent: Record<string, unknown> = {};
      circularContent.self = circularContent;
      const sections = extractGenAiSections(
        attrs({ 'gen_ai.system_instructions': [{ type: 'text', content: circularContent }] })
      );
      expect(section(sections, 'conversation')?.systemInstructions).toBe(String(circularContent));
    });
  });

  describe('toolCall section', () => {
    it('extracts a tool call when any tool attribute is present', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.tool.name': 'get_weather',
          'gen_ai.tool.call.id': 'call_1',
          'gen_ai.tool.call.arguments': { city: 'NYC' },
          'gen_ai.tool.call.result': { tempF: 72 },
        })
      );
      expect(section(sections, 'toolCall')).toEqual({
        id: 'call_1',
        name: 'get_weather',
        arguments: { city: 'NYC' },
        result: { tempF: 72 },
      });
    });

    it('produces a toolCall section from gen_ai.tool.call.id alone, fixing the previous drop-to-nowhere bug', () => {
      const sections = extractGenAiSections(attrs({ 'gen_ai.tool.call.id': 'call_1' }));
      expect(section(sections, 'toolCall')).toEqual({
        id: 'call_1',
        name: undefined,
        arguments: undefined,
        result: undefined,
      });
      // Since gen_ai.tool.call.id is claimed by the toolCall builder, it must
      // not also appear in "other" - otherwise it would show up twice.
      expect(section(sections, 'other')).toBeUndefined();
    });

    it('produces no toolCall section when no tool attributes are present', () => {
      const sections = extractGenAiSections(attrs({ 'gen_ai.usage.input_tokens': 10 }));
      expect(section(sections, 'toolCall')).toBeUndefined();
    });
  });

  describe('other section', () => {
    it('surfaces unhandled gen_ai.* attributes via the other section', () => {
      const sections = extractGenAiSections(
        attrs({
          'gen_ai.operation.name': 'chat',
          'gen_ai.conversation.id': 'conv-1',
          'http.method': 'GET',
        })
      );
      expect(section(sections, 'other')?.attributes.entries()).toEqual([
        { key: 'gen_ai.operation.name', value: 'chat' },
        { key: 'gen_ai.conversation.id', value: 'conv-1' },
      ]);
    });

    it('excludes attributes already claimed by a builder from the other section', () => {
      const sections = extractGenAiSections(
        attrs({ 'gen_ai.provider.name': 'openai', 'gen_ai.usage.input_tokens': 10 })
      );
      expect(section(sections, 'other')).toBeUndefined();
    });

    it('excludes non-gen_ai attributes from the other section', () => {
      const sections = extractGenAiSections(attrs({ 'http.method': 'GET' }));
      expect(section(sections, 'other')).toBeUndefined();
    });

    it('preserves a repeated attribute key instead of dropping the earlier occurrence, since attributes are tracked by index, not name', () => {
      const duplicateKeyAttrs: IAttribute[] = [
        { key: 'gen_ai.tool.name', value: 'first_call' },
        { key: 'gen_ai.tool.name', value: 'second_call' },
      ];
      const sections = extractGenAiSections(makeAttributes(duplicateKeyAttrs));
      // The first occurrence is claimed by the toolCall builder.
      expect(section(sections, 'toolCall')?.name).toBe('first_call');
      // The second occurrence is not claimed by anything, so it must still
      // surface under "other" rather than being silently discarded by a
      // name-keyed Map that would have kept only the last value.
      expect(section(sections, 'other')?.attributes.entries()).toEqual([
        { key: 'gen_ai.tool.name', value: 'second_call' },
      ]);
    });
  });

  // Message attributes are instrumentation output, so any field can be missing or be of
  // the wrong type. Every read in genAiData is typeof-guarded for that reason; these
  // tests hold that line, and pin the two cases where a malformed value used to produce
  // a data: URI that no browser could decode.
  describe('malformed messages', () => {
    const messageContent = (value: unknown) =>
      section(extractGenAiSections(attrs({ 'gen_ai.output.messages': value })), 'conversation')
        ?.outputMessages;

    it.each([
      ['parts is not an array', [{ role: 'assistant', parts: 'nope' }]],
      ['parts is null', [{ role: 'assistant', parts: null }]],
      ['parts is empty', [{ role: 'assistant', parts: [] }]],
      ['a part is null', [{ role: 'assistant', parts: [null] }]],
      ['a part is a number', [{ role: 'assistant', parts: [42] }]],
      ['a part is an array', [{ role: 'assistant', parts: [[]] }]],
      ['a part has no type', [{ role: 'assistant', parts: [{}] }]],
      ['a message entry is null', [null]],
      ['a message entry is a number', [7]],
      ['the value is truncated JSON', '{"broken'],
      ['the value is a number', 42],
      [
        'a part nests 200 deep',
        [{ role: 'assistant', parts: [JSON.parse('['.repeat(200) + ']'.repeat(200))] }],
      ],
    ])('yields a string rather than throwing when %s', (_case, value) => {
      const messages = messageContent(value);
      (messages ?? []).forEach(m => expect(typeof m.content).toBe('string'));
    });

    it('shows the raw part when the field it renders from is the wrong type', () => {
      // Falling back to the JSON dump keeps the part visible, which is the whole point
      // of not stubbing these out.
      expect(messageContent([{ role: 'assistant', parts: [{ type: 'uri', uri: null }] }])?.[0].content).toBe(
        '{\n  "type": "uri",\n  "uri": null\n}'
      );
      expect(
        messageContent([{ role: 'assistant', parts: [{ type: 'file', file_id: 3 }] }])?.[0].content
      ).toBe('{\n  "type": "file",\n  "file_id": 3\n}');
    });

    it('refuses a mime_type carrying a comma, which would move where the payload starts', () => {
      expect(
        messageContent([
          { role: 'assistant', parts: [{ type: 'blob', mime_type: 'image/png,x', content: 'AAAA' }] },
        ])?.[0].content
      ).toBe('image/png,x attachment, 3 B');
    });

    it('refuses base64 that is only padding, which decodes to nothing', () => {
      expect(
        messageContent([
          { role: 'assistant', parts: [{ type: 'blob', mime_type: 'image/png', content: '====' }] },
        ])?.[0].content
      ).toBe('image/png attachment');
    });

    it('accepts line-wrapped base64, unwrapping it into the data URI', () => {
      expect(
        messageContent([
          {
            role: 'assistant',
            parts: [{ type: 'blob', mime_type: 'image/png', content: 'iVBO\nRw0K\nGgo=' }],
          },
        ])?.[0].parts[0].src
      ).toBe('data:image/png;base64,iVBORw0KGgo=');
    });
  });

  it('returns an empty section list for a span with no gen_ai attributes', () => {
    const sections = extractGenAiSections(attrs({ 'http.method': 'GET' }));
    expect(sections).toEqual([]);
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

describe('tryParseJson', () => {
  it('parses a plain JSON object string', () => {
    expect(tryParseJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('parses a JSON object with leading whitespace/newlines, not falling back to the raw string', () => {
    expect(tryParseJson('\n  {"a":1}')).toEqual({ a: 1 });
  });

  it('parses a JSON array with leading whitespace', () => {
    expect(tryParseJson('\n[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('returns non-JSON strings unchanged, including ones with leading whitespace', () => {
    expect(tryParseJson('  hello world')).toBe('  hello world');
  });

  it('returns the original string unchanged when it looks like JSON but fails to parse', () => {
    expect(tryParseJson('{not valid json')).toBe('{not valid json');
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
