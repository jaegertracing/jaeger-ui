// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IAttribute, IOtelSpan } from '../../types/otel';

// Canonical attribute key constants
export const GEN_AI_SYSTEM = 'gen_ai.system';
export const GEN_AI_OPERATION_NAME = 'gen_ai.operation.name';
export const GEN_AI_REQUEST_MODEL = 'gen_ai.request.model';
export const GEN_AI_USAGE_INPUT_TOKENS = 'gen_ai.usage.input_tokens';
export const GEN_AI_USAGE_OUTPUT_TOKENS = 'gen_ai.usage.output_tokens';
export const GEN_AI_PROMPT = 'gen_ai.prompt';
export const GEN_AI_COMPLETION = 'gen_ai.completion';
export const GEN_AI_TOOL_NAME = 'gen_ai.tool.name';
export const GEN_AI_TOOL_CALL_ID = 'gen_ai.tool.call.id';
export const GEN_AI_TOOL_INPUT = 'gen_ai.tool.input';
export const GEN_AI_TOOL_OUTPUT = 'gen_ai.tool.output';
export const DB_SYSTEM = 'db.system';
export const DB_COLLECTION_NAME = 'db.collection.name';

export const GEN_AI_PREFIX = 'gen_ai.';

/** Returns the raw attribute value for the given key, or undefined if not present. */
export function getAttr(span: IOtelSpan, key: string): IAttribute['value'] | undefined {
  return span.attributes.find(a => a.key === key)?.value;
}

/** Returns all attributes whose key starts with the given prefix. */
export function getAttrsByPrefix(span: IOtelSpan, prefix: string): IAttribute[] {
  return span.attributes.filter(a => a.key.startsWith(prefix));
}

const IMAGE_RE = /\.(png|jpg|jpeg|gif|webp|svg)([?#].*)?$/i;
const AUDIO_RE = /\.(mp3|wav|ogg|flac|m4a)([?#].*)?$/i;

export function isMediaUrl(value: unknown): 'image' | 'audio' | null {
  if (typeof value !== 'string') return null;
  if (IMAGE_RE.test(value)) return 'image';
  if (AUDIO_RE.test(value)) return 'audio';
  return null;
}
