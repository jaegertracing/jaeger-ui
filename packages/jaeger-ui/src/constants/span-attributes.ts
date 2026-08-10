// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

export const GEN_AI_NAMESPACE = 'gen_ai.';

export const GEN_AI_OPERATION_NAME = 'gen_ai.operation.name';

export const GEN_AI_REQUEST_MODEL = 'gen_ai.request.model';
export const GEN_AI_RESPONSE_MODEL = 'gen_ai.response.model';

export const GEN_AI_SYSTEM = 'gen_ai.system';
export const GEN_AI_PROVIDER_NAME = 'gen_ai.provider.name';

export const GEN_AI_TOOL_NAME = 'gen_ai.tool.name';

// A tool call's cross-span reference. Present on spans that merely *mention* a
// tool call, so on its own it does not make a span a GenAI span.
export const GEN_AI_TOOL_CALL_ID = 'gen_ai.tool.call.id';

export const GEN_AI_AGENT_NAME = 'gen_ai.agent.name';
export const GEN_AI_AGENT_ID = 'gen_ai.agent.id';

export const GEN_AI_USAGE_INPUT_TOKENS = 'gen_ai.usage.input_tokens';
export const GEN_AI_USAGE_OUTPUT_TOKENS = 'gen_ai.usage.output_tokens';
export const GEN_AI_USAGE_TOTAL_TOKENS = 'gen_ai.usage.total_tokens';
