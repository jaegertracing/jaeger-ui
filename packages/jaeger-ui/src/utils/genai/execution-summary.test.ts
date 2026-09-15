// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IOtelSpan, StatusCode } from '../../types/otel';
import { makeAttributes } from '../../model/attributes';
import { getGenAIExecutionSummary } from './execution-summary';

function makeSpan(overrides: Partial<IOtelSpan> = {}): IOtelSpan {
  const zero = 0 as IOtelSpan['startTime'];
  return {
    attributes: makeAttributes(),
    childSpans: [],
    depth: 0,
    duration: zero,
    endTime: zero,
    events: [],
    hasChildren: false,
    inboundLinks: [],
    instrumentationScope: { name: 'test' },
    kind: 'INTERNAL' as IOtelSpan['kind'],
    links: [],
    name: 'test',
    relativeStartTime: zero,
    resource: { attributes: makeAttributes(), serviceName: 'test' },
    spanID: 'span',
    startTime: zero,
    status: { code: StatusCode.OK },
    traceID: 'trace',
    warnings: null,
    ...overrides,
  };
}

describe('getGenAIExecutionSummary', () => {
  it('returns undefined when no spans have a recognized GenAI classification', () => {
    expect(getGenAIExecutionSummary([makeSpan()])).toBeUndefined();
  });

  it('counts operation kinds and normalized failures', () => {
    const spans = [
      makeSpan({ genAIKind: 'AGENT' }),
      makeSpan({ genAIKind: 'LLM_CALL' }),
      makeSpan({ genAIKind: 'TOOL_CALL', status: { code: StatusCode.ERROR } }),
      makeSpan({ genAIKind: 'RETRIEVAL' }),
      makeSpan({ genAIKind: 'UNKNOWN_GENAI' }),
    ];

    expect(getGenAIExecutionSummary(spans)).toMatchObject({
      agentCount: 1,
      failedOperationCount: 1,
      modelOperationCount: 1,
      operationCount: 5,
      otherGenAIOperationCount: 1,
      retrievalOperationCount: 1,
      toolOperationCount: 1,
    });
  });

  it('aggregates standard token usage from model operations only and preserves zero', () => {
    const spans = [
      makeSpan({
        genAIKind: 'AGENT',
        attributes: makeAttributes([
          { key: 'gen_ai.usage.input_tokens', value: 999 },
          { key: 'gen_ai.usage.output_tokens', value: 999 },
        ]),
      }),
      makeSpan({
        genAIKind: 'LLM_CALL',
        attributes: makeAttributes([
          { key: 'gen_ai.usage.input_tokens', value: 100 },
          { key: 'gen_ai.usage.output_tokens', value: 0 },
        ]),
      }),
      makeSpan({
        genAIKind: 'LLM_CALL',
        attributes: makeAttributes([{ key: 'gen_ai.usage.input_tokens', value: 40 }]),
      }),
    ];

    expect(getGenAIExecutionSummary(spans)).toMatchObject({ inputTokens: 140, outputTokens: 0 });
  });

  it('leaves token totals unavailable when model spans do not record them', () => {
    expect(getGenAIExecutionSummary([makeSpan({ genAIKind: 'LLM_CALL' })])).toMatchObject({
      inputTokens: undefined,
      outputTokens: undefined,
    });
  });
});
