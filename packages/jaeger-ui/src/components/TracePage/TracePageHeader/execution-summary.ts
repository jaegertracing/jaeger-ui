// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IOtelSpan, StatusCode } from '../../../types/otel';
import { GenAiTokenUsage, getGenAiTokenUsage } from '../TraceTimelineViewer/SpanDetail/GenAITab/genAiData';

export interface IGenAIExecutionSummary {
  callCount: number;
  agentCount: number;
  modelCallCount: number;
  toolCallCount: number;
  retrievalCallCount: number;
  otherGenAICallCount: number;
  inputTokens?: number;
  outputTokens?: number;
  failedCallCount: number;
}

export const GEN_AI_CALL_ROWS = [
  { key: 'agentCount', label: 'Agents' },
  { key: 'modelCallCount', label: 'Model calls' },
  { key: 'toolCallCount', label: 'Tool calls' },
  { key: 'retrievalCallCount', label: 'Retrieval calls' },
  { key: 'otherGenAICallCount', label: 'Other GenAI' },
] as const satisfies ReadonlyArray<{ key: keyof IGenAIExecutionSummary; label: string }>;

function addTokens(
  totals: Pick<IGenAIExecutionSummary, 'inputTokens' | 'outputTokens'>,
  usage: GenAiTokenUsage | undefined
): void {
  if (usage?.inputTokens !== undefined) {
    totals.inputTokens = (totals.inputTokens ?? 0) + usage.inputTokens;
  }
  if (usage?.outputTokens !== undefined) {
    totals.outputTokens = (totals.outputTokens ?? 0) + usage.outputTokens;
  }
}

/**
 * Produces a trace-wide GenAI summary from the cached span classification.
 * This deliberately reads only classification, normalized status, and the two
 * aggregate token attributes; no prompt, completion, message, or tool data is read.
 */
export function getGenAIExecutionSummary(
  spans: ReadonlyArray<IOtelSpan>
): IGenAIExecutionSummary | undefined {
  let agentCount = 0;
  let modelCallCount = 0;
  let toolCallCount = 0;
  let retrievalCallCount = 0;
  let otherGenAICallCount = 0;
  let failedCallCount = 0;
  const tokenTotals: Pick<IGenAIExecutionSummary, 'inputTokens' | 'outputTokens'> = {};

  for (const span of spans) {
    if (span.genAIKind === undefined) continue;

    if (span.status.code === StatusCode.ERROR) failedCallCount++;

    switch (span.genAIKind) {
      case 'AGENT':
        agentCount++;
        break;
      case 'LLM_CALL':
        modelCallCount++;
        addTokens(tokenTotals, getGenAiTokenUsage(span.attributes));
        break;
      case 'TOOL_CALL':
        toolCallCount++;
        break;
      case 'RETRIEVAL':
        retrievalCallCount++;
        break;
      default:
        otherGenAICallCount++;
    }
  }

  const callCount = agentCount + modelCallCount + toolCallCount + retrievalCallCount + otherGenAICallCount;
  if (callCount === 0) return undefined;

  return {
    callCount,
    agentCount,
    modelCallCount,
    toolCallCount,
    retrievalCallCount,
    otherGenAICallCount,
    inputTokens: tokenTotals.inputTokens,
    outputTokens: tokenTotals.outputTokens,
    failedCallCount,
  };
}
