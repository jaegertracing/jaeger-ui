// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IAttribute, AttributeValue } from '../../../../../types/otel';

type GenAiRole = 'system' | 'user' | 'assistant' | 'tool' | undefined;

const GEN_AI_ROLES = new Set(['system', 'user', 'assistant', 'tool']);

function asRole(value: unknown): GenAiRole {
  return typeof value === 'string' && GEN_AI_ROLES.has(value) ? (value as GenAiRole) : undefined;
}

export type GenAiMessage = {
  role: GenAiRole;
  content: string;
};

type GenAiToolCall = {
  id?: string;
  name?: string;
  arguments?: unknown;
  result?: unknown;
};

type GenAiTokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
  reasoningOutputTokens?: number;
};

type GenAiData = {
  provider?: string;
  model?: string;
  usage: GenAiTokenUsage;
  inputMessages: GenAiMessage[];
  outputMessages: GenAiMessage[];
  systemInstructions?: string;
  toolCall?: GenAiToolCall;
  otherAttributes: IAttribute[];
};

// Attribute keys already surfaced by named fields above (including deprecated
// aliases). Anything else starting with "gen_ai." falls through to
// otherAttributes so a span is never shown as empty when isGenAISpan is true.
const HANDLED_KEYS = new Set([
  'gen_ai.provider.name',
  'gen_ai.system',
  'gen_ai.response.model',
  'gen_ai.request.model',
  'gen_ai.input.messages',
  'gen_ai.prompt',
  'gen_ai.output.messages',
  'gen_ai.completion',
  'gen_ai.usage.input_tokens',
  'gen_ai.usage.output_tokens',
  'gen_ai.usage.cache_read.input_tokens',
  'gen_ai.usage.cache_creation.input_tokens',
  'gen_ai.usage.reasoning.output_tokens',
  'gen_ai.tool.name',
  'gen_ai.tool.call.arguments',
  'gen_ai.tool.call.result',
  'gen_ai.tool.call.id',
  'gen_ai.system_instructions',
]);

function findAttribute(attributes: ReadonlyArray<IAttribute>, key: string): AttributeValue | undefined {
  return attributes.find(a => a.key === key)?.value;
}

function asString(value: AttributeValue | undefined): string | undefined {
  if (typeof value === 'string') return value;
  if (value == null) return undefined;
  return String(value);
}

function asNumber(value: AttributeValue | undefined): number | undefined {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

/**
 * gen_ai.system_instructions is a JSON array of `{ type: "text", content: "..." }`
 * parts per the OTel spec (not a plain string), though instrumentation MAY fall
 * back to a raw string if it can't produce structured output. Handle both.
 */
function parseSystemInstructions(value: AttributeValue | undefined): string | undefined {
  if (value == null) return undefined;
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return value;
    }
  }
  if (!Array.isArray(parsed)) return undefined;
  const text = parsed
    .map(part =>
      typeof part === 'object' && part !== null ? (part as Record<string, unknown>).content : part
    )
    .filter(content => content != null)
    .map(content => (typeof content === 'string' ? content : JSON.stringify(content)))
    .join('\n\n');
  return text || undefined;
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

const jsonObjectOrArrayStartRegex = /^(\[|\{)/;

/**
 * Only attempts JSON.parse when the string looks like an object/array literal,
 * same guard as AttributesTable.tryParseJson - avoids relying on try/catch
 * exceptions for control flow on the common case of plain, non-JSON strings.
 */
export function tryParseJson(value: string): unknown {
  try {
    return jsonObjectOrArrayStartRegex.test(value) ? JSON.parse(value) : value;
  } catch {
    return value;
  }
}

/**
 * Instrumentation commonly emits tool-call arguments/results as an
 * already-JSON-encoded string rather than a parsed object. Parse-then-restringify
 * so the output isn't double-encoded (`"{\"city\":\"Paris\"}"` instead of
 * `{"city":"Paris"}`); non-JSON strings are kept as-is. Mirrors JsonBlock's
 * handling of the same shape for the top-level gen_ai.tool.call.* attributes.
 */
function stringifyToolValue(value: unknown): string {
  if (typeof value === 'string') {
    const parsed = tryParseJson(value);
    return parsed === value ? value : JSON.stringify(parsed);
  }
  return JSON.stringify(value ?? {});
}

/**
 * Renders one ChatMessage part per the OTel GenAI parts schema (text,
 * tool_call, tool_call_response, reasoning, blob/file/uri, compaction,
 * server_tool_call(_response)). Unrecognized/future part types fall back to
 * a JSON dump so nothing is silently dropped.
 */
function renderPart(part: unknown): string {
  if (typeof part !== 'object' || part === null) return String(part);
  const rec = part as Record<string, unknown>;
  switch (rec.type) {
    case 'text':
    case 'reasoning':
    case 'compaction':
      return typeof rec.content === 'string' ? rec.content : stringifyValue(rec.content ?? rec);
    case 'tool_call':
    case 'server_tool_call': {
      const name = typeof rec.name === 'string' ? rec.name : 'unknown_tool';
      // Field name genuinely differs by part type, not a typo: per the OTel
      // GenAI parts schema, ToolCallRequestPart carries its payload under
      // `arguments`, while ServerToolCallPart carries it under a same-named
      // `server_tool_call` field (a polymorphic, provider-specific object).
      const args = rec.type === 'tool_call' ? rec.arguments : rec.server_tool_call;
      return `→ ${name}(${stringifyToolValue(args)})`;
    }
    case 'tool_call_response':
      return `← ${stringifyToolValue(rec.response)}`;
    case 'server_tool_call_response':
      return `← ${stringifyToolValue(rec.server_tool_call_response)}`;
    case 'blob':
    case 'file':
    case 'uri': {
      const modality = typeof rec.modality === 'string' ? rec.modality : 'file';
      return `[${modality} attached]`;
    }
    default:
      return stringifyValue(rec);
  }
}

function renderParts(parts: unknown): string {
  if (!Array.isArray(parts)) return stringifyValue(parts);
  return parts.map(renderPart).join('\n\n');
}

/**
 * OTel GenAI message attributes may arrive already parsed (array/object,
 * per the IAttribute value type) or as a JSON-encoded string, depending on
 * the instrumentation. Handle both.
 *
 * Current spec (gen_ai.input.messages/output.messages): each ChatMessage is
 * `{ role, parts: [...] }` - there is no top-level `content` field, message
 * text/tool-calls/media all live inside `parts`. The deprecated
 * gen_ai.prompt/gen_ai.completion attributes instead used a flat
 * `{ role, content }` shape - kept as a fallback for older instrumentation.
 */
function parseMessages(value: AttributeValue | undefined): GenAiMessage[] {
  if (value == null) return [];
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      // Not JSON - treat the whole string as a single message with no role.
      return [{ role: undefined, content: value }];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((entry): GenAiMessage => {
    if (typeof entry !== 'object' || entry === null) {
      return { role: undefined, content: String(entry) };
    }
    const rec = entry as Record<string, unknown>;
    const role = asRole(rec.role);
    if (Array.isArray(rec.parts)) {
      return { role, content: renderParts(rec.parts) };
    }
    const content = rec.content;
    const contentStr =
      typeof content === 'string'
        ? content
        : content !== undefined
          ? stringifyValue(content)
          : stringifyValue(rec);
    return { role, content: contentStr };
  });
}

/**
 * Extracts GenAI span data from OTel attributes.
 * Checks current attribute names first, falling back to deprecated ones
 * still commonly emitted by existing instrumentation:
 * - gen_ai.provider.name (current) vs gen_ai.system (deprecated)
 * - gen_ai.input.messages/output.messages (current) vs gen_ai.prompt/completion (deprecated)
 */
export function extractGenAiData(attributes: ReadonlyArray<IAttribute>): GenAiData {
  const provider = asString(
    findAttribute(attributes, 'gen_ai.provider.name') ?? findAttribute(attributes, 'gen_ai.system')
  );
  const model = asString(
    findAttribute(attributes, 'gen_ai.response.model') ?? findAttribute(attributes, 'gen_ai.request.model')
  );

  const inputMessagesRaw =
    findAttribute(attributes, 'gen_ai.input.messages') ?? findAttribute(attributes, 'gen_ai.prompt');
  const outputMessagesRaw =
    findAttribute(attributes, 'gen_ai.output.messages') ?? findAttribute(attributes, 'gen_ai.completion');

  const usage: GenAiTokenUsage = {
    inputTokens: asNumber(findAttribute(attributes, 'gen_ai.usage.input_tokens')),
    outputTokens: asNumber(findAttribute(attributes, 'gen_ai.usage.output_tokens')),
    cacheReadInputTokens: asNumber(findAttribute(attributes, 'gen_ai.usage.cache_read.input_tokens')),
    cacheCreationInputTokens: asNumber(findAttribute(attributes, 'gen_ai.usage.cache_creation.input_tokens')),
    reasoningOutputTokens: asNumber(findAttribute(attributes, 'gen_ai.usage.reasoning.output_tokens')),
  };

  const toolName = asString(findAttribute(attributes, 'gen_ai.tool.name'));
  const toolArguments = findAttribute(attributes, 'gen_ai.tool.call.arguments');
  const toolResult = findAttribute(attributes, 'gen_ai.tool.call.result');
  const toolId = asString(findAttribute(attributes, 'gen_ai.tool.call.id'));
  const hasToolCall = toolName != null || toolArguments != null || toolResult != null;

  const otherAttributes = attributes.filter(a => a.key.startsWith('gen_ai.') && !HANDLED_KEYS.has(a.key));

  return {
    provider,
    model,
    usage,
    inputMessages: parseMessages(inputMessagesRaw),
    outputMessages: parseMessages(outputMessagesRaw),
    systemInstructions: parseSystemInstructions(findAttribute(attributes, 'gen_ai.system_instructions')),
    toolCall: hasToolCall
      ? { id: toolId, name: toolName, arguments: toolArguments, result: toolResult }
      : undefined,
    otherAttributes,
  };
}

export function hasAnyTokenUsage(usage: GenAiTokenUsage): boolean {
  return Object.values(usage).some(v => v != null);
}

export function formatTokenCount(value: number | undefined): string | undefined {
  if (value == null) return undefined;
  return new Intl.NumberFormat('en-US').format(value);
}
