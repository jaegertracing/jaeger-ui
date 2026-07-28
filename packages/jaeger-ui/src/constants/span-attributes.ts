// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

export const GEN_AI_NAMESPACE = 'gen_ai.';

export const GEN_AI_OPERATION_NAME = 'gen_ai.operation.name';

export const GEN_AI_REQUEST_MODEL = 'gen_ai.request.model';

export const GEN_AI_TOOL_NAME = 'gen_ai.tool.name';

// A tool call's cross-span reference. Present on spans that merely *mention* a
// tool call, so on its own it does not make a span a GenAI span.
export const GEN_AI_TOOL_CALL_ID = 'gen_ai.tool.call.id';

// Vector-store retrieval spans are emitted by the DB instrumentation, not the
// GenAI instrumentation, so they carry db.* rather than gen_ai.* attributes.
export const DB_SYSTEM = 'db.system';

export const DB_SYSTEM_VECTOR = 'vector';

// Non-spec attribute used by agent frameworks to group spans into one episode.
export const AGENT_EPISODE_ID = 'agent.episode_id';
