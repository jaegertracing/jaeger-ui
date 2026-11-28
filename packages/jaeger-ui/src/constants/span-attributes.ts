// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

export const GEN_AI_NAMESPACE = 'gen_ai.';

export const GEN_AI_OPERATION_NAME = 'gen_ai.operation.name';

export const GEN_AI_REQUEST_MODEL = 'gen_ai.request.model';

export const GEN_AI_TOOL_NAME = 'gen_ai.tool.name';

// A tool call's cross-span reference. Present on spans that merely *mention* a
// tool call, so on its own it does not make a span a GenAI span.
export const GEN_AI_TOOL_CALL_ID = 'gen_ai.tool.call.id';

// The list of tool definitions offered to the model for the current span.
export const GEN_AI_TOOL_DEFINITIONS = 'gen_ai.tool.definitions';

// Identifies the conversation (thread, session) that a GenAI span belongs to. Agent
// frameworks usually emit one trace per turn, and every turn of a conversation carries the
// same value. Jaeger matches it as a plain string, exactly as recorded.
export const GEN_AI_CONVERSATION_ID = 'gen_ai.conversation.id';

// Generic OTel session identifier. Some frameworks set only this one, so the conversation
// view falls back to it when no trace carries gen_ai.conversation.id.
export const SESSION_ID = 'session.id';
