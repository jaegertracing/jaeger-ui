// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IAttributes, AttributeValue } from '../../../../../types/otel';
import { makeAttributes } from '../../../../../model/attributes';
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
  // Where the part's media can be loaded from, if anywhere: a uri part's URI, a data:
  // URI built from a blob's payload, or the whole text of a part that is itself a link.
  src?: string;
  // What that source is, when it is an image or an audio clip. Set together with src, so a
  // part carries both what to load and how to show it, and the view never has to guess.
  mediaType?: MediaType;
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
  | { type: 'agent'; data: GenAiAgent }
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
 * Makes a part out of text alone, and notices when the whole of that text is a media link.
 *
 * This is how a plain URL sent as message text becomes an image: nothing in the message
 * declares a type, so the value itself is all there is to go on.
 */
function textPart(text: string): GenAiPart {
  const src = text.trim();
  const mediaType = detectMediaType(src);
  return mediaType ? { text, src, mediaType } : { text };
}

function asModality(rec: Record<string, unknown>): string {
  return typeof rec.modality === 'string' ? rec.modality : 'file';
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
  const label = typeof rec.mime_type === 'string' ? rec.mime_type : asModality(rec);
  const content = base64Payload(rec.content);
  if (!content) return `${label} attachment`;
  const padding = (content.match(/=*$/)?.[0] ?? '').length;
  const bytes = Math.max(0, Math.floor((content.length * 3) / 4) - padding);
  const size = bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} KB`;
  return `${label} attachment, ${size}`;
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
    case 'text':
    case 'reasoning':
    case 'compaction':
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
      const mediaType = attachmentMediaType(rec, uri);
      return mediaType ? { text: uri, src: uri, mediaType } : { text: uri };
    }
    case 'file':
      return {
        text:
          typeof rec.file_id === 'string' ? `${asModality(rec)} file ${rec.file_id}` : stringifyValue(rec),
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
        src: `data:${mimeType};base64,${content}`,
        mediaType: mimeType.split('/')[0].toLowerCase() as MediaType,
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

function joinParts(parts: GenAiPart[]): string {
  return parts.map(part => part.text).join('\n\n');
}

function message(role: GenAiRole, parts: GenAiPart[]): GenAiMessage {
  return { role, content: joinParts(parts), parts };
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
    const content = rec.content;
    const contentStr =
      typeof content === 'string'
        ? content
        : content !== undefined
          ? stringifyValue(content)
          : stringifyValue(rec);
    return message(role, [textPart(contentStr)]);
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
