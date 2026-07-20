// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IAttributes, AttributeValue } from '../../../../../types/otel';
import { makeAttributes } from '../../../../../model/attributes';

type GenAiRole = 'system' | 'user' | 'assistant' | 'tool' | undefined;

const GEN_AI_ROLES = new Set(['system', 'user', 'assistant', 'tool']);

function asRole(value: unknown): GenAiRole {
  return typeof value === 'string' && GEN_AI_ROLES.has(value) ? (value as GenAiRole) : undefined;
}

export type GenAiMessage = {
  role: GenAiRole;
  content: string;
};

export type GenAiToolCall = {
  id?: string;
  name?: string;
  arguments?: unknown;
  result?: unknown;
};

export type GenAiTokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
  reasoningOutputTokens?: number;
};

// Every variant separates its discriminant (`type`) from its payload (`data`)
// so a generic fallback renderer can walk `Object.entries(data)` for a
// section type it doesn't have a specific case for.
export type GenAiSection =
  | { type: 'meta'; data: { provider?: string; model?: string } }
  | { type: 'tokens'; data: GenAiTokenUsage }
  | {
      type: 'conversation';
      data: { systemInstructions?: string; inputMessages: GenAiMessage[]; outputMessages: GenAiMessage[] };
    }
  | { type: 'toolCall'; data: GenAiToolCall }
  | { type: 'other'; data: { attributes: IAttributes } };

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

function stringifyValue(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * gen_ai.system_instructions is a JSON array of `{ type: "text", content: "..." }`
 * parts per the OTel spec, though instrumentation MAY emit a single part object
 * (not array-wrapped) or a raw string instead. Handle all three so a
 * non-array-but-otherwise-valid value doesn't get silently dropped.
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
  const parts = Array.isArray(parsed) ? parsed : [parsed];
  const text = parts
    .map(part =>
      typeof part === 'object' && part !== null ? (part as Record<string, unknown>).content : part
    )
    .filter(content => content != null)
    .map(stringifyValue)
    .join('\n\n');
  return text || undefined;
}

const jsonObjectOrArrayStartRegex = /^\s*[[{]/;

/**
 * Only attempts JSON.parse when the string looks like an object/array literal,
 * a similar guard to AttributesTable.tryParseJson - avoids relying on try/catch
 * exceptions for control flow on the common case of plain, non-JSON strings.
 * Unlike AttributesTable's guard, leading whitespace is tolerated here so
 * pretty-printed/indented JSON (e.g. "\n{...}") is still detected - JSON.parse
 * itself already ignores it.
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
  // Not routed through stringifyValue: it pretty-prints with 2-space
  // indentation, which would break the single-line "-> name(args)" format
  // this value renders into. Same try/catch safety against malformed,
  // non-serializable data, just without the formatting change.
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return String(value);
  }
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
 * the instrumentation. Handle both, including a single already-parsed
 * message object that isn't array-wrapped - wrapping it in a one-element
 * array preserves it instead of silently returning no messages for it.
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
  const entries = Array.isArray(parsed) ? parsed : [parsed];
  return entries.map((entry): GenAiMessage => {
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

export function hasAnyTokenUsage(usage: GenAiTokenUsage): boolean {
  return Object.values(usage).some(v => v != null);
}

export function formatTokenCount(value: number | undefined): string | undefined {
  if (value == null) return undefined;
  return new Intl.NumberFormat('en-US').format(value);
}

// get() claims a key as a side effect of reading it (removes it from the
// shared pool). A build function's "owned keys" are exactly the keys it
// happens to call get() on - nothing is declared twice, so there is no
// separate allowlist that can drift out of sync with what's actually read.
type GetAttr = (key: string) => AttributeValue | undefined;
type SectionBuilder = (get: GetAttr) => GenAiSection | undefined;

// Array order IS render order - no separate rank field to keep in sync with
// position; the loop below walks this array (developer-controlled, fixed
// order), not the span's attributes (whose order is instrumentation-dependent).
const REGISTRY: SectionBuilder[] = [
  get => {
    // gen_ai.provider.name/gen_ai.system is a genuine current/deprecated pair -
    // `||` short-circuits so gen_ai.system is only read (and claimed) when
    // gen_ai.provider.name is absent/empty, leaving a disagreeing legacy value
    // unclaimed so it surfaces in "Other GenAI Attributes" instead of being
    // silently discarded.
    const provider = asString(get('gen_ai.provider.name')) || asString(get('gen_ai.system'));

    // gen_ai.request.model/gen_ai.response.model are NOT a current/deprecated
    // pair per the OTel spec - both are current, and they record different
    // things: which model was requested vs. which model actually served the
    // response (a provider substituting a pinned version, e.g. request
    // "gpt-4" / response "gpt-4-0613", is the expected case, not a conflict).
    // Show both rather than collapsing one into a fallback for the other.
    const requestModel = asString(get('gen_ai.request.model'));
    const responseModel = asString(get('gen_ai.response.model'));
    const model =
      responseModel && requestModel && responseModel !== requestModel
        ? `${responseModel} (requested: ${requestModel})`
        : responseModel || requestModel;

    return provider || model ? { type: 'meta', data: { provider, model } } : undefined;
  },
  get => {
    const usage: GenAiTokenUsage = {
      inputTokens: asNumber(get('gen_ai.usage.input_tokens')),
      outputTokens: asNumber(get('gen_ai.usage.output_tokens')),
      cacheReadInputTokens: asNumber(get('gen_ai.usage.cache_read.input_tokens')),
      cacheCreationInputTokens: asNumber(get('gen_ai.usage.cache_creation.input_tokens')),
      reasoningOutputTokens: asNumber(get('gen_ai.usage.reasoning.output_tokens')),
    };
    return hasAnyTokenUsage(usage) ? { type: 'tokens', data: usage } : undefined;
  },
  get => {
    // Same short-circuit-on-purpose rule as the meta builder above: only fall
    // back to gen_ai.prompt/gen_ai.completion when the current key is absent,
    // so a legacy value that disagrees with the current one is left unclaimed
    // and surfaces in "Other GenAI Attributes" instead of being silently
    // dropped.
    const inputMessages = parseMessages(get('gen_ai.input.messages') ?? get('gen_ai.prompt'));
    const outputMessages = parseMessages(get('gen_ai.output.messages') ?? get('gen_ai.completion'));
    const systemInstructions = parseSystemInstructions(get('gen_ai.system_instructions'));
    return inputMessages.length || outputMessages.length || systemInstructions
      ? { type: 'conversation', data: { inputMessages, outputMessages, systemInstructions } }
      : undefined;
  },
  get => {
    const id = asString(get('gen_ai.tool.call.id'));
    const name = asString(get('gen_ai.tool.name'));
    const args = get('gen_ai.tool.call.arguments');
    const result = get('gen_ai.tool.call.result');
    return id || name || args !== undefined || result !== undefined
      ? { type: 'toolCall', data: { id, name, arguments: args, result } }
      : undefined;
  },
];

/**
 * Extracts GenAI span data as a single-pass registry of section builders:
 * each builder above reads whichever keys it needs through get() (which
 * claims an attribute the moment it's read), and whatever's left unclaimed
 * afterward automatically becomes the generic "other" section. There is no
 * second, separately maintained key list to keep in sync with what each
 * builder reads.
 *
 * indicesByKey is built once, up front, mapping each key to the (ordered)
 * list of indices where it appears - a repeated gen_ai.* key is not
 * collapsed into a single entry the way a plain Map<key, value> would
 * collapse it (silently keeping only the last value and losing any earlier
 * occurrence before a builder ever saw it, with no path to "Other GenAI
 * Attributes" either, since the key would already read as claimed). get()
 * then does an O(1) map lookup plus popping the front of a short
 * (typically single-element) per-key list, rather than re-scanning the
 * whole attributes array on every call.
 */
export function extractGenAiSections(attributes: IAttributes): GenAiSection[] {
  // This builder genuinely needs every attribute (it claims keys and buckets
  // the leftovers), so entries() is the sanctioned whole-collection access.
  const entries = attributes.entries();
  const indicesByKey = new Map<string, number[]>();
  entries.forEach((a, i) => {
    const indices = indicesByKey.get(a.key);
    if (indices) indices.push(i);
    else indicesByKey.set(a.key, [i]);
  });

  const claimed = new Set<number>();
  const get: GetAttr = key => {
    const index = indicesByKey.get(key)?.shift();
    if (index === undefined) return undefined;
    claimed.add(index);
    return entries[index].value;
  };

  const sections = REGISTRY.map(build => build(get)).filter((s): s is GenAiSection => s !== undefined);

  const other = entries
    .filter((a, i) => !claimed.has(i) && a.key.startsWith('gen_ai.'))
    .map(({ key, value }) => ({ key, value }));
  if (other.length) sections.push({ type: 'other', data: { attributes: makeAttributes(other) } });

  return sections;
}
