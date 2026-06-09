// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

export { detectGenAISpan, isGenAITrace } from './detect-gen-ai';
export type { GenAISpanKind } from './detect-gen-ai';
export {
  DB_COLLECTION_NAME,
  GEN_AI_COMPLETION,
  GEN_AI_OPERATION_NAME,
  GEN_AI_PROMPT,
  GEN_AI_REQUEST_MODEL,
  GEN_AI_SYSTEM,
  GEN_AI_TOOL_CALL_ID,
  GEN_AI_TOOL_INPUT,
  GEN_AI_TOOL_NAME,
  GEN_AI_TOOL_OUTPUT,
  GEN_AI_USAGE_INPUT_TOKENS,
  GEN_AI_USAGE_OUTPUT_TOKENS,
  getAttr,
  getAttrsByPrefix,
  isMediaUrl,
} from './gen-ai-attrs';
