// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

/**
 * Attribute keys that carry structured GenAI content and deserve richer
 * rendering than a plain flat key-value row.
 *
 * Values indicate the preferred rendering hint:
 *   - 'markdown': the value is natural-language text (e.g. a prompt)
 *   - 'json':     the value is serialised JSON (e.g. tool arguments)
 *
 * @see https://opentelemetry.io/docs/specs/semconv/gen-ai/
 */
const RICH_MEDIA_ATTRIBUTE_KEYS: Readonly<Record<string, 'markdown' | 'json'>> = {
  'gen_ai.input.messages': 'markdown',
  'gen_ai.output.messages': 'markdown',
  'gen_ai.system_instructions': 'markdown',
  'gen_ai.tool.call.arguments': 'json',
  'gen_ai.tool.call.result': 'json',
  'gen_ai.tool.definitions': 'json',
  'gen_ai.retrieval.documents': 'json',
};

export const GENAI_RICH_MEDIA_ATTRIBUTE_KEYS = new Set(Object.keys(RICH_MEDIA_ATTRIBUTE_KEYS));
