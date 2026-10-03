// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IOtelSpan, StatusCode } from '../../types/otel';

export interface IGenAIExecutionSummary {
  agentCount: number;
  failedOperationCount: number;
  inputTokens?: number;
  modelOperationCount: number;
  operationCount: number;
  otherGenAIOperationCount: number;
  outputTokens?: number;
  retrievalOperationCount: number;
  toolOperationCount: number;
}

function addTokenCount(total: number | undefined, value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? (total ?? 0) + value : total;
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
  let modelOperationCount = 0;
  let toolOperationCount = 0;
  let retrievalOperationCount = 0;
  let otherGenAIOperationCount = 0;
  let failedOperationCount = 0;
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;

  for (const span of spans) {
    if (span.genAIKind === undefined) continue;

    if (span.status.code === StatusCode.ERROR) failedOperationCount++;

    switch (span.genAIKind) {
      case 'AGENT':
        agentCount++;
        break;
      case 'LLM_CALL':
        modelOperationCount++;
        inputTokens = addTokenCount(inputTokens, span.attributes.getValue('gen_ai.usage.input_tokens'));
        outputTokens = addTokenCount(outputTokens, span.attributes.getValue('gen_ai.usage.output_tokens'));
        break;
      case 'TOOL_CALL':
        toolOperationCount++;
        break;
      case 'RETRIEVAL':
        retrievalOperationCount++;
        break;
      default:
        otherGenAIOperationCount++;
    }
  }

  const operationCount =
    agentCount +
    modelOperationCount +
    toolOperationCount +
    retrievalOperationCount +
    otherGenAIOperationCount;
  if (operationCount === 0) return undefined;

  return {
    agentCount,
    failedOperationCount,
    inputTokens,
    modelOperationCount,
    operationCount,
    otherGenAIOperationCount,
    outputTokens,
    retrievalOperationCount,
    toolOperationCount,
  };
}
