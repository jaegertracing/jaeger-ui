// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IAttributes, AttributeValue } from '../../../../../types/otel';
import { makeAttributes } from '../../../../../model/attributes';
import {
  BRAINTRUST_INPUT,
  BRAINTRUST_INPUT_JSON,
  BRAINTRUST_OUTPUT,
  BRAINTRUST_OUTPUT_JSON,
  SPAN_INPUT,
  SPAN_OUTPUT,
} from '../../../../../constants/span-attributes';
import { classifySpan } from '../../../../../utils/genai/detect';
import { detectMediaType, MediaType } from '../../../../../utils/media';

type GenAiRole = 'system' | 'user' | 'assistant' | 'tool' | undefined;

const GEN_AI_ROLES = new Set(['system', 'user', 'assistant', 'tool']);

function asRole(value: unknown): GenAiRole {
  return typeof value === 'string' && GEN_AI_ROLES.has(value) ? (value as GenAiRole) : undefined;
}

/**
 * One rendered piece of a message: its text, plus a source when a browser could load it.
 *
 * A message is a list of parts per the spec, and a single message may mix them - the
 * multimodal example in the conventions is one user turn carrying a question and the
 * image it asks about. So each part is kept separate and rendered in place, which is what
 * lets an attachment be shown without the text around it being lost.
 */
export type GenAiPart = {
  // What this part reads as. For an attachment whose bytes cannot be shown in place, a
  // description of it - see blobSummary.
  text: string;
  // An image or audio clip this part carries, if it carries one: where to load it from
  // (a uri part's URI, a data: URI built from a blob's payload, or the whole text of a
  // part that is itself a link) and which of the two it is. Loading it needs both, so
  // they are one field and the view never has to guess at either.
  media?: { src: string; type: MediaType };
};

export type GenAiMessage = {
  role: GenAiRole;
  // Every part's text joined, which is what Copy, Plain text, Markdown and the JSON view
  // all act on. A message with one text part - still the common case - reads exactly as
  // its text.
  content: string;
  parts: GenAiPart[];
};

export type GenAiToolCall = {
  id?: string;
  name?: string;
  arguments?: unknown;
  result?: unknown;
};

// Fields per the gen_ai.agent.* registry (create_agent/invoke_agent spans): id, name,
// version, description. All are individually optional/conditionally-required per spec,
// so a span can carry any subset.
export type GenAiAgent = {
  id?: string;
  name?: string;
  version?: string;
  description?: string;
};

/**
 * The token counts an inference span can report.
 *
 * The first five are totals. The rest split those totals by modality, which the spec
 * says to report "when applicable" and asks to be counted in the total as well, so a
 * span that sends audio shows both the total and the audio share of it.
 */
export type GenAiTokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  reasoningOutputTokens?: number;
  cacheReadInputTokens?: number;
  cacheWriteInputTokens?: number;
  textInputTokens?: number;
  imageInputTokens?: number;
  audioInputTokens?: number;
  textOutputTokens?: number;
  imageOutputTokens?: number;
  audioOutputTokens?: number;
  textCacheReadInputTokens?: number;
  imageCacheReadInputTokens?: number;
  audioCacheReadInputTokens?: number;
};

/**
 * The attribute a displayed value was read from when that is not the name the OTel GenAI
 * conventions define for it. The view marks such a value with both names, so a reader can
 * see which name the span uses and which name the conventions expect. A `deprecated` key
 * is a name an earlier version of the conventions defined; a `vendor` key never was one.
 */
export type GenAiAttributeSource = { key: string; spec: string; kind: 'deprecated' | 'vendor' };

// Names that earlier versions of the conventions defined and a later version replaced.
const DEPRECATED_SPEC_NAMES = new Set([
  'gen_ai.prompt',
  'gen_ai.completion',
  'gen_ai.usage.prompt_tokens',
  'gen_ai.usage.completion_tokens',
  'gen_ai.usage.cache_creation.input_tokens',
]);

// Every variant separates its discriminant (`type`) from its payload (`data`)
// so a generic fallback renderer can walk `Object.entries(data)` for a
// section type it doesn't have a specific case for. `sources` sits beside
// `data` because it describes where the data came from, not the data itself.
export type GenAiSection =
  | { type: 'agent'; data: GenAiAgent }
  | { type: 'meta'; data: { operation?: string; provider?: string; model?: string } }
  | {
      type: 'tokens';
      data: GenAiTokenUsage;
      sources: Partial<Record<keyof GenAiTokenUsage, GenAiAttributeSource>>;
    }
  | {
      type: 'conversation';
      data: { systemInstructions?: string; inputMessages: GenAiMessage[]; outputMessages: GenAiMessage[] };
      sources: { input?: GenAiAttributeSource; output?: GenAiAttributeSource };
    }
  | {
      type: 'toolCall';
      data: GenAiToolCall;
      sources: { arguments?: GenAiAttributeSource; result?: GenAiAttributeSource };
    }
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
 * Walks an already-parsed JSON value and replaces every string that itself parses as a
 * JSON object or array with the parsed value, repeating until no such string remains.
 * Instrumentation that stringifies a payload before putting it inside another payload
 * (a chat message whose `content` is itself a serialized `{role, parts}` message, whose
 * `content` is in turn a serialized tool result, and so on) produces values that the tree
 * view otherwise shows as one escaped string per level. The walk is lossy by design: a
 * string that merely looks like JSON is unwrapped too, so the reader can switch back to
 * the plain tree.
 *
 * Returns the input itself (same reference) when no string was unwrapped, so a caller can
 * tell by identity whether the walk found anything, without a second traversal. The same
 * happens for a value nested too deeply to walk: JSON.parse accepts thousands of levels,
 * and a recursive walk over them would overflow the stack, so the overflow is caught and
 * the value is treated as having nothing to unwrap rather than failing the render.
 */
export function deepParseJson(value: unknown): unknown {
  try {
    return walkJson(value);
  } catch {
    return value;
  }
}

function walkJson(value: unknown): unknown {
  if (typeof value === 'string') {
    const parsed = tryParseJson(value);
    return parsed === value ? value : walkJson(parsed);
  }
  if (Array.isArray(value)) {
    const items = value.map(walkJson);
    return items.some((item, i) => item !== value[i]) ? items : value;
  }
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value);
    const walked = entries.map(([k, v]) => [k, walkJson(v)] as const);
    return walked.some(([, v], i) => v !== entries[i][1]) ? Object.fromEntries(walked) : value;
  }
  return value;
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
 * Makes a part out of text alone, and notices when the whole of that text is a media link.
 *
 * This is how a plain URL sent as message text becomes an image: nothing in the message
 * declares a type, so the value itself is all there is to go on.
 */
function textPart(text: string): GenAiPart {
  const src = text.trim();
  const type = detectMediaType(src);
  return type ? { text, media: { src, type } } : { text };
}

/**
 * Names an attachment, e.g. "image/png attachment" or "image file abc123".
 *
 * A blob, file or uri part is required to carry a modality and may also carry a mime_type,
 * which is the more precise of the two and so preferred. Nothing enforces either, and a
 * part that names neither is still worth describing by what it is.
 */
function describeAttachment(rec: Record<string, unknown>, noun: string): string {
  const kind = typeof rec.mime_type === 'string' ? rec.mime_type : rec.modality;
  return typeof kind === 'string' && kind ? `${kind} ${noun}` : noun;
}

// A blob's mime_type is only usable in a data: URI if it is a bare type/subtype with
// optional parameters. A data: URI ends its metadata at the first comma, so a mime_type
// containing one - which instrumentation has no reason to send but nothing prevents -
// would redefine where the payload starts and produce a broken image.
const MEDIA_MIME_TYPE = /^(image|audio)\/[\w.+-]+(?:;[\w.+-]+=[\w.+-]+)*$/i;

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

// A uri part may name a location only the provider can resolve - the spec's own example is
// gs://bucket/object.png - so only these two schemes give the browser something to load.
const LOADABLE_SCHEME = /^(?:https?|data):/i;

/**
 * What an attachment part says it carries, or null if nothing renderable is named.
 *
 * The part is asked before its URL is: a uri part is required to carry a `modality` and
 * may carry a `mime_type`, so an instrumentation that says "image" is believed even when
 * the URL has no extension to read, as `/render?id=5` does not. Sniffing the URL is the
 * last resort, for a part that declares neither.
 */
function attachmentMediaType(rec: Record<string, unknown>, uri: string): MediaType | null {
  const mimeType = typeof rec.mime_type === 'string' ? rec.mime_type : '';
  if (MEDIA_MIME_TYPE.test(mimeType)) return mimeType.split('/')[0].toLowerCase() as MediaType;
  const modality = typeof rec.modality === 'string' ? rec.modality.toLowerCase() : '';
  if (modality === 'image' || modality === 'audio') return modality;
  return detectMediaType(uri);
}

/**
 * Returns a blob part's content as base64 with any wrapping whitespace removed, or an
 * empty string if it is not base64 at all.
 *
 * Whitespace is not part of the encoding, so line-wrapped base64 is accepted and
 * unwrapped. Padding alone is not: `====` carries no bytes, and passing it through would
 * offer the reader an image that cannot decode.
 */
function base64Payload(value: unknown): string {
  if (typeof value !== 'string') return '';
  const packed = value.replace(/\s+/g, '');
  return BASE64.test(packed) ? packed : '';
}

/**
 * Describes a blob part by its type and payload size, e.g. "image/png attachment, 42 KB".
 *
 * Base64 encodes three bytes as four characters, so the decoded size is the length times
 * 3/4, less one byte per trailing '=' pad. Sizes are approximate by one or two bytes at
 * worst, which is what a reader wants from them.
 */
function blobSummary(rec: Record<string, unknown>): string {
  const label = describeAttachment(rec, 'attachment');
  const content = base64Payload(rec.content);
  if (!content) return label;
  const padding = (content.match(/=*$/)?.[0] ?? '').length;
  const bytes = Math.max(0, Math.floor((content.length * 3) / 4) - padding);
  const size = bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} KB`;
  return `${label}, ${size}`;
}

/**
 * Renders one ChatMessage part per the OTel GenAI parts schema (text,
 * tool_call, tool_call_response, reasoning, blob/file/uri, compaction,
 * server_tool_call(_response)). Unrecognized/future part types fall back to
 * a JSON dump so nothing is silently dropped.
 */
function toPart(part: unknown): GenAiPart {
  if (typeof part !== 'object' || part === null) return textPart(String(part));
  const rec = part as Record<string, unknown>;
  switch (rec.type) {
    // Conversation history the provider replaced with a summary. The summary is
    // optional and usually absent, so the part says what happened when there is
    // nothing of it to read.
    case 'compaction':
      return typeof rec.content === 'string' && rec.content
        ? textPart(rec.content)
        : { text: 'Conversation compacted' };
    case 'text':
    case 'reasoning':
      return textPart(typeof rec.content === 'string' ? rec.content : stringifyValue(rec.content ?? rec));
    case 'tool_call':
    case 'server_tool_call': {
      const name = typeof rec.name === 'string' ? rec.name : 'unknown_tool';
      // Field name genuinely differs by part type, not a typo: per the OTel
      // GenAI parts schema, ToolCallRequestPart carries its payload under
      // `arguments`, while ServerToolCallPart carries it under a same-named
      // `server_tool_call` field (a polymorphic, provider-specific object).
      const args = rec.type === 'tool_call' ? rec.arguments : rec.server_tool_call;
      return { text: `\u2192 ${name}(${stringifyToolValue(args)})` };
    }
    case 'tool_call_response':
      return { text: `\u2190 ${stringifyToolValue(rec.response)}` };
    case 'server_tool_call_response':
      return { text: `\u2190 ${stringifyToolValue(rec.server_tool_call_response)}` };
    // The three attachment part types, worked through with examples at
    // https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/non-normative/examples-llm-calls.md#multimodal-chat-completion
    //
    // A uri part reads as its URI, and carries it as a source when a browser could
    // actually fetch it. A file part has only an opaque provider id, which is worth
    // showing and impossible to load.
    case 'uri': {
      if (typeof rec.uri !== 'string') return { text: stringifyValue(rec) };
      const uri = rec.uri.trim();
      if (!LOADABLE_SCHEME.test(uri)) return { text: uri };
      const type = attachmentMediaType(rec, uri);
      return type ? { text: uri, media: { src: uri, type } } : { text: uri };
    }
    case 'file':
      return {
        text:
          typeof rec.file_id === 'string'
            ? describeAttachment(rec, `file ${rec.file_id}`)
            : stringifyValue(rec),
      };
    // A blob is the one part whose bytes cannot be read in place: thousands of base64
    // characters would bury the rest of the message. So its text describes it while its
    // source carries the payload, and the media view renders the image either way.
    case 'blob': {
      const mimeType = typeof rec.mime_type === 'string' ? rec.mime_type : '';
      const content = base64Payload(rec.content);
      if (!content || !MEDIA_MIME_TYPE.test(mimeType)) return { text: blobSummary(rec) };
      return {
        text: blobSummary(rec),
        media: {
          src: `data:${mimeType};base64,${content}`,
          type: mimeType.split('/')[0].toLowerCase() as MediaType,
        },
      };
    }
    default:
      return { text: stringifyValue(rec) };
  }
}

function toParts(parts: unknown): GenAiPart[] {
  if (!Array.isArray(parts)) return [textPart(stringifyValue(parts))];
  return parts.map(toPart);
}

function message(role: GenAiRole, parts: GenAiPart[]): GenAiMessage {
  return { role, content: parts.map(part => part.text).join('\n\n'), parts };
}

/**
 * OTel GenAI message attributes may arrive already parsed (array/object,
 * per the IAttribute value type) or as a JSON-encoded string, depending on
 * the instrumentation. Handle both, including a single already-parsed
 * message object that isn't array-wrapped - wrapping it in a one-element
 * array preserves it instead of silently returning no messages for it.
 *
 * Current spec (gen_ai.input.messages/output.messages): each ChatMessage is
 * `{ role, parts: [...] }` - `role` and `parts` are the required properties and
 * there is no top-level `content` field, so message text, tool calls and media
 * all live inside `parts`. The deprecated gen_ai.prompt/gen_ai.completion
 * attributes instead used a flat `{ role, content }` shape - kept as a fallback
 * for older instrumentation.
 *
 * The GenAI conventions now live in their own repository, which has yet to cut a release
 * and has no rendered docs site, so these link to markdown on its main branch:
 * https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/registry/attributes/gen-ai.md#gen-ai-input-messages
 * https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-spans.md#capturing-instructions-inputs-and-outputs
 */
function parseMessages(value: AttributeValue | undefined): GenAiMessage[] {
  if (value == null) return [];
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      // Not JSON - treat the whole string as a single message with no role.
      return [message(undefined, [textPart(value)])];
    }
  }
  const entries = Array.isArray(parsed) ? parsed : [parsed];
  return entries.map((entry): GenAiMessage => {
    if (typeof entry !== 'object' || entry === null) {
      return message(undefined, [textPart(String(entry))]);
    }
    const rec = entry as Record<string, unknown>;
    const role = asRole(rec.role);
    if (Array.isArray(rec.parts)) return message(role, toParts(rec.parts));
    // An object is a flat message only when its content holds something and it has a role
    // or nothing but content. Any other object, such as a task result that also carries a
    // score, or an assistant turn whose content is null because it holds tool calls
    // instead, is shown whole. A flat message with a role still shows only its content,
    // so a field beside role and content, such as a tool_call_id, is not shown.
    const isFlatMessage =
      rec.content != null && ('role' in rec || Object.keys(rec).every(key => key === 'content'));
    if (!isFlatMessage) return message(role, [textPart(stringifyValue(rec))]);
    return message(role, [
      textPart(typeof rec.content === 'string' ? rec.content : stringifyValue(rec.content)),
    ]);
  });
}

export function hasAnyTokenUsage(usage: GenAiTokenUsage): boolean {
  return Object.values(usage).some(v => v != null);
}

/**
 * The attribute names each token count is read from: the current spec name first, then
 * older or vendor names. Array order is the render order of the token row.
 *
 * gen_ai.usage.prompt_tokens and completion_tokens are the names the conventions used
 * before OTel semantic conventions v1.27.0 renamed them to input_tokens and
 * output_tokens, and gen_ai.usage.cache_creation.input_tokens is the name the conventions
 * used before the GenAI conventions repository renamed it to cache_write.input_tokens.
 * The remaining names are in no spec version: SDKs have been observed to write Anthropic's
 * API usage field names (cache_read_input_tokens, cache_creation_input_tokens) and
 * Braintrust's metric names (prompt_cached_tokens, prompt_cache_creation_tokens) under
 * the gen_ai.usage. prefix.
 */
const TOKEN_ATTRIBUTES: ReadonlyArray<[field: keyof GenAiTokenUsage, spec: string, ...fallbacks: string[]]> =
  [
    ['inputTokens', 'gen_ai.usage.input_tokens', 'gen_ai.usage.prompt_tokens'],
    ['outputTokens', 'gen_ai.usage.output_tokens', 'gen_ai.usage.completion_tokens'],
    ['reasoningOutputTokens', 'gen_ai.usage.reasoning.output_tokens'],
    [
      'cacheReadInputTokens',
      'gen_ai.usage.cache_read.input_tokens',
      'gen_ai.usage.cache_read_input_tokens',
      'gen_ai.usage.prompt_cached_tokens',
    ],
    [
      'cacheWriteInputTokens',
      'gen_ai.usage.cache_write.input_tokens',
      'gen_ai.usage.cache_creation.input_tokens',
      'gen_ai.usage.cache_creation_input_tokens',
      'gen_ai.usage.prompt_cache_creation_tokens',
    ],
    ['textInputTokens', 'gen_ai.usage.text.input_tokens'],
    ['imageInputTokens', 'gen_ai.usage.image.input_tokens'],
    ['audioInputTokens', 'gen_ai.usage.audio.input_tokens'],
    ['textOutputTokens', 'gen_ai.usage.text.output_tokens'],
    ['imageOutputTokens', 'gen_ai.usage.image.output_tokens'],
    ['audioOutputTokens', 'gen_ai.usage.audio.output_tokens'],
    ['textCacheReadInputTokens', 'gen_ai.usage.text.cache_read.input_tokens'],
    ['imageCacheReadInputTokens', 'gen_ai.usage.image.cache_read.input_tokens'],
    ['audioCacheReadInputTokens', 'gen_ai.usage.audio.cache_read.input_tokens'],
  ];

type TokenUsageWithSources = {
  usage: GenAiTokenUsage;
  sources: Partial<Record<keyof GenAiTokenUsage, GenAiAttributeSource>>;
};

/**
 * Reads `spec` and then each fallback name until `accept` yields a value, returning that
 * value and, when it came from a fallback name, its source. Only the name that yields the
 * value is claimed, so a spec value that `accept` rejects stays visible in "Other GenAI
 * Attributes" beside the fallback that replaced it, and every name after the one chosen
 * stays visible too. When no name yields a value, the spec name is claimed anyway: a
 * rejected value with nothing to disagree with is not worth a section of its own, which
 * is also how the single-name reads behaved before the fallbacks existed.
 *
 * `attributes` is read for the value and `get` only to claim it, so a key that appears
 * twice on a span would be read from its first occurrence and claimed at its first
 * unclaimed one; no builder reads the same key twice, so the two coincide.
 */
function readFirst<T>(
  get: GetAttr,
  attributes: IAttributes,
  spec: string,
  fallbacks: readonly string[],
  accept: (value: AttributeValue | undefined) => T | undefined
): { value: T; source?: GenAiAttributeSource } | undefined {
  for (const key of [spec, ...fallbacks]) {
    const value = accept(attributes.getValue(key));
    if (value === undefined) continue;
    get(key);
    if (key === spec) return { value };
    return { value, source: { key, spec, kind: DEPRECATED_SPEC_NAMES.has(key) ? 'deprecated' : 'vendor' } };
  }
  get(spec);
  return undefined;
}

/**
 * Reads each count from the first of its names that holds a number. A count read under a
 * non-spec name is recorded in `sources`.
 */
function getGenAiTokenUsageFromGetter(
  get: GetAttr,
  attributes: IAttributes
): TokenUsageWithSources | undefined {
  const usage: GenAiTokenUsage = {};
  const sources: TokenUsageWithSources['sources'] = {};
  TOKEN_ATTRIBUTES.forEach(([field, spec, ...fallbacks]) => {
    const read = readFirst(get, attributes, spec, fallbacks, asNumber);
    if (!read) return;
    usage[field] = read.value;
    if (read.source) sources[field] = read.source;
  });
  return Object.keys(usage).length ? { usage, sources } : undefined;
}

/** Extracts the token-usage attributes shared by the GenAI tab and trace summary. */
export function getGenAiTokenUsage(attributes: IAttributes): GenAiTokenUsage | undefined {
  return getGenAiTokenUsageFromGetter(key => attributes.getValue(key), attributes)?.usage;
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
// `attributes` is the whole span, read without claiming, for a builder that needs to
// know whether a key is present, including one another builder has already taken, before
// deciding what to read itself.
type SectionBuilder = (get: GetAttr, attributes: IAttributes) => GenAiSection | undefined;

/**
 * The generic span I/O keys some SDKs write beside, or instead of, the gen_ai.* names:
 * the unprefixed input/output of span models whose every span has an input and an
 * output, and Braintrust's braintrust.input_json/braintrust.output_json (a JSON string)
 * and braintrust.input/braintrust.output (a plain value). None of these are gen_ai.*
 * keys, so an unclaimed one lands in the span's regular attributes table rather than in
 * "Other GenAI Attributes".
 */
const GENERIC_INPUT_KEYS = [SPAN_INPUT, BRAINTRUST_INPUT_JSON, BRAINTRUST_INPUT];
const GENERIC_OUTPUT_KEYS = [SPAN_OUTPUT, BRAINTRUST_OUTPUT_JSON, BRAINTRUST_OUTPUT];

// A message attribute is usable when it holds something. null, an empty string and an
// empty JSON array or object fall through to the next name the same way a non-number
// does for a token count.
const EMPTY_JSON = /^\s*(\[\s*\]|\{\s*\})\s*$/;
function asPresent(value: AttributeValue | undefined): AttributeValue | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value.trim() === '' || EMPTY_JSON.test(value) ? undefined : value;
  if (Array.isArray(value)) return value.length ? value : undefined;
  if (typeof value === 'object') return Object.keys(value).length ? value : undefined;
  return value;
}

// A tool span, as classifySpan decides it: a recognized gen_ai.operation.name settles the
// kind either way, and only a span of no known kind is taken as a tool span for carrying
// a tool call's arguments or result.
function isToolCallSpan(attributes: IAttributes): boolean {
  const kind = classifySpan({ attributes });
  if (kind === 'TOOL_CALL') return true;
  if (kind !== undefined && kind !== 'UNKNOWN_GENAI') return false;
  return attributes.has('gen_ai.tool.call.arguments') || attributes.has('gen_ai.tool.call.result');
}

// Array order IS render order - no separate rank field to keep in sync with
// position; the loop below walks this array (developer-controlled, fixed
// order), not the span's attributes (whose order is instrumentation-dependent).
const REGISTRY: SectionBuilder[] = [
  get => {
    const id = asString(get('gen_ai.agent.id'));
    const name = asString(get('gen_ai.agent.name'));
    const version = asString(get('gen_ai.agent.version'));
    const description = asString(get('gen_ai.agent.description'));
    // Presence, not truthiness: get() already claimed these keys, so a
    // legitimate empty-string value must still produce a section - otherwise
    // it's dropped here AND excluded from "Other GenAI Attributes" (already
    // claimed), silently losing the attribute entirely.
    return id !== undefined || name !== undefined || version !== undefined || description !== undefined
      ? { type: 'agent', data: { id, name, version, description } }
      : undefined;
  },
  get => {
    // Every GenAI span carries gen_ai.operation.name ("chat", "execute_tool", ...), so
    // leaving it unclaimed gave most spans an "Other GenAI Attributes" section holding
    // nothing else. It says what the span did, which belongs beside the model that did it.
    const operation = asString(get('gen_ai.operation.name'));

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

    return operation || provider || model
      ? { type: 'meta', data: { operation, provider, model } }
      : undefined;
  },
  (get, attributes) => {
    const tokens = getGenAiTokenUsageFromGetter(get, attributes);
    return tokens ? { type: 'tokens', data: tokens.usage, sources: tokens.sources } : undefined;
  },
  (get, attributes) => {
    // Each side reads the spec name first and falls back only when it is absent or
    // empty, so a value that disagrees with the spec value is left unclaimed and
    // surfaces in "Other GenAI Attributes" instead of being silently dropped.
    //
    // gen_ai.prompt/gen_ai.completion are the deprecated spec names. Bare
    // gen_ai.input/gen_ai.output are not in any spec version; some
    // instrumentations emit them on a single LLM call span, holding the one
    // input and the one output rather than a message array. parseMessages
    // wraps such a scalar or object into a one-element list, so the value
    // renders as the span's only message.
    //
    // The generic I/O keys are read last. SDKs that write them on every span have
    // been observed to keep gen_ai.input.messages beside them when they have it,
    // so the spec key still wins. On a tool span they hold the tool call's
    // arguments and result, so the tool call builder below reads them instead.
    const isToolCall = isToolCallSpan(attributes);
    const genericInput = isToolCall ? [] : GENERIC_INPUT_KEYS;
    const genericOutput = isToolCall ? [] : GENERIC_OUTPUT_KEYS;
    const input = readFirst(
      get,
      attributes,
      'gen_ai.input.messages',
      ['gen_ai.prompt', 'gen_ai.input', ...genericInput],
      asPresent
    );
    const output = readFirst(
      get,
      attributes,
      'gen_ai.output.messages',
      ['gen_ai.completion', 'gen_ai.output', ...genericOutput],
      asPresent
    );
    const inputMessages = parseMessages(input?.value);
    const outputMessages = parseMessages(output?.value);
    const systemInstructions = parseSystemInstructions(get('gen_ai.system_instructions'));
    return inputMessages.length || outputMessages.length || systemInstructions
      ? {
          type: 'conversation',
          data: { inputMessages, outputMessages, systemInstructions },
          sources: { input: input?.source, output: output?.source },
        }
      : undefined;
  },
  (get, attributes) => {
    const id = asString(get('gen_ai.tool.call.id'));
    const name = asString(get('gen_ai.tool.name'));
    // On a tool span the generic I/O keys hold the arguments and the result, which the
    // conversation builder above left for this one. Any present value counts, `{}` and
    // `''` included, because a tool can take no arguments and return nothing.
    const generic = isToolCallSpan(attributes);
    const args = readFirst(
      get,
      attributes,
      'gen_ai.tool.call.arguments',
      generic ? GENERIC_INPUT_KEYS : [],
      value => value
    );
    const result = readFirst(
      get,
      attributes,
      'gen_ai.tool.call.result',
      generic ? GENERIC_OUTPUT_KEYS : [],
      value => value
    );
    return id || name || args || result
      ? {
          type: 'toolCall',
          data: { id, name, arguments: args?.value, result: result?.value },
          sources: { arguments: args?.source, result: result?.source },
        }
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
  const sections = REGISTRY.map(build => build(get, attributes)).filter(
    (s): s is GenAiSection => s !== undefined
  );

  const other = entries
    .filter((a, i) => !claimed.has(i) && a.key.startsWith('gen_ai.'))
    .map(({ key, value }) => ({ key, value }));
  if (other.length) sections.push({ type: 'other', data: { attributes: makeAttributes(other) } });

  return sections;
}
