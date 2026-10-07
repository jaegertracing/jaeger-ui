// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { StatusCode } from '../../types/otel';
import { makeAttributes } from '../../model/attributes';
import { getGenAIExecutionSummary } from './execution-summary';
import { makeGenAISpan } from './test-utils';

describe('getGenAIExecutionSummary', () => {
  it('returns undefined when no spans have a recognized GenAI classification', () => {
    expect(getGenAIExecutionSummary([makeGenAISpan()])).toBeUndefined();
  });

  it('counts call kinds and normalized failures', () => {
    const spans = [
      makeGenAISpan({ genAIKind: 'AGENT' }),
      makeGenAISpan({ genAIKind: 'LLM_CALL' }),
      makeGenAISpan({ genAIKind: 'TOOL_CALL', status: { code: StatusCode.ERROR } }),
      makeGenAISpan({ genAIKind: 'RETRIEVAL' }),
      makeGenAISpan({ genAIKind: 'UNKNOWN_GENAI' }),
    ];

    expect(getGenAIExecutionSummary(spans)).toMatchObject({
      agentCount: 1,
      callCount: 5,
      failedCallCount: 1,
      modelCallCount: 1,
      otherGenAICallCount: 1,
      retrievalCallCount: 1,
      toolCallCount: 1,
    });
  });

  it('aggregates standard token usage from model calls only and preserves zero', () => {
    const spans = [
      makeGenAISpan({
        genAIKind: 'AGENT',
        attributes: makeAttributes([
          { key: 'gen_ai.usage.input_tokens', value: 999 },
          { key: 'gen_ai.usage.output_tokens', value: 999 },
        ]),
      }),
      makeGenAISpan({
        genAIKind: 'LLM_CALL',
        attributes: makeAttributes([
          { key: 'gen_ai.usage.input_tokens', value: 100 },
          { key: 'gen_ai.usage.output_tokens', value: 0 },
        ]),
      }),
      makeGenAISpan({
        genAIKind: 'LLM_CALL',
        attributes: makeAttributes([{ key: 'gen_ai.usage.input_tokens', value: 40 }]),
      }),
      makeGenAISpan({
        genAIKind: 'LLM_CALL',
        attributes: makeAttributes([
          { key: 'gen_ai.usage.input_tokens', value: '60' },
          { key: 'gen_ai.usage.output_tokens', value: '10' },
        ]),
      }),
    ];

    expect(getGenAIExecutionSummary(spans)).toMatchObject({ inputTokens: 200, outputTokens: 10 });
  });

  it('leaves token totals unavailable when model spans do not record them', () => {
    expect(getGenAIExecutionSummary([makeGenAISpan({ genAIKind: 'LLM_CALL' })])).toMatchObject({
      inputTokens: undefined,
      outputTokens: undefined,
    });
  });
});
