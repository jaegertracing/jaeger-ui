// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IEvent } from '../../types/otel';

type GenAiAttributeValue = string | number | boolean | null | undefined | object;

type GenAiSpanKind = 'agent' | 'llm' | 'tool' | 'retrieval' | 'workflow';
type AttributesLike = ReadonlyArray<{ key: string; value: unknown }> | null | undefined;

export type GenAiMetadata = {
  agentName?: string;
  operationName?: string;
  model?: string;
  provider?: string;
  toolName?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  totalCost?: number;
  prompt?: string;
  completion?: string;
};

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function getAttributeValue(attributes: AttributesLike, key: string): GenAiAttributeValue {
  if (!attributes) return undefined;
  const match = attributes.find(attr => attr.key === key);
  if (!match) return undefined;
  return match.value as GenAiAttributeValue;
}

function getStringAttribute(attributes: AttributesLike, key: string): string | undefined {
  const value = getAttributeValue(attributes, key);
  if (typeof value === 'string') return value;
  if (value == null) return undefined;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function getNumberAttribute(attributes: AttributesLike, key: string): number | undefined {
  const value = getAttributeValue(attributes, key);
  return asNumber(value);
}

export function getGenAiMetadata(attributes: AttributesLike, events?: ReadonlyArray<IEvent>): GenAiMetadata {
  const inputTokens = getNumberAttribute(attributes, 'gen_ai.usage.input_tokens');
  const outputTokens = getNumberAttribute(attributes, 'gen_ai.usage.output_tokens');
  const totalTokens = (inputTokens || 0) + (outputTokens || 0);
  const totalCost =
    getNumberAttribute(attributes, 'gen_ai.usage.total_cost') ??
    getNumberAttribute(attributes, 'gen_ai.usage.cost');

  let inputMessages = getStringAttribute(attributes, 'gen_ai.input.messages');
  let outputMessages = getStringAttribute(attributes, 'gen_ai.output.messages');

  if (events) {
    events.forEach(event => {
      const eventInput = getStringAttribute(event.attributes, 'gen_ai.input.messages');
      if (eventInput) inputMessages = eventInput;

      const eventOutput = getStringAttribute(event.attributes, 'gen_ai.output.messages');
      if (eventOutput) outputMessages = eventOutput;
    });
  }

  return {
    agentName: getStringAttribute(attributes, 'gen_ai.agent.name'),
    operationName: getStringAttribute(attributes, 'gen_ai.operation.name'),
    model: getStringAttribute(attributes, 'gen_ai.request.model'),
    provider: getStringAttribute(attributes, 'gen_ai.system'),
    toolName: getStringAttribute(attributes, 'gen_ai.tool.name'),
    prompt: inputMessages || getStringAttribute(attributes, 'gen_ai.prompt'),
    completion: outputMessages || getStringAttribute(attributes, 'gen_ai.completion'),
    inputTokens,
    outputTokens,
    totalTokens: totalTokens > 0 ? totalTokens : undefined,
    totalCost: totalCost && totalCost > 0 ? totalCost : undefined,
  };
}

function getGenAiSpanKind(attributes: AttributesLike, spanName?: string): GenAiSpanKind | null {
  const normalizedSpanName = spanName ? spanName.toLowerCase() : '';

  const agentName = getStringAttribute(attributes, 'gen_ai.agent.name');
  if (
    agentName ||
    normalizedSpanName.startsWith('create_agent ') ||
    normalizedSpanName.startsWith('invoke_agent ')
  ) {
    return 'agent';
  }

  const toolName = getStringAttribute(attributes, 'gen_ai.tool.name');
  if (toolName || normalizedSpanName.startsWith('execute_tool ') || normalizedSpanName.startsWith('tool ')) {
    return 'tool';
  }

  const operation = getStringAttribute(attributes, 'gen_ai.operation.name');
  const normalizedOperation = operation ? operation.toLowerCase() : '';

  if (
    normalizedOperation === 'retrieval' ||
    normalizedOperation === 'rag' ||
    normalizedOperation.includes('retrieve') ||
    normalizedSpanName.includes('retrieval') ||
    normalizedSpanName.includes('retrieve') ||
    normalizedSpanName.includes('knowledge retriever') ||
    normalizedSpanName.includes('knowledge_retriever') ||
    normalizedSpanName.includes('vector_search') ||
    normalizedSpanName.includes('vector search') ||
    normalizedSpanName.includes('query_engine') ||
    /\brag\b/.test(normalizedSpanName) ||
    attributes?.some(attr => attr.key.startsWith('gen_ai.retrieval.'))
  ) {
    return 'retrieval';
  }

  if (normalizedSpanName.startsWith('invoke_workflow ') || normalizedSpanName.includes('workflow')) {
    return 'workflow';
  }

  const hasModel = Boolean(getStringAttribute(attributes, 'gen_ai.request.model'));
  const hasSystem = Boolean(getStringAttribute(attributes, 'gen_ai.system'));
  const hasTokens =
    getNumberAttribute(attributes, 'gen_ai.usage.input_tokens') != null ||
    getNumberAttribute(attributes, 'gen_ai.usage.output_tokens') != null;

  const isGenAiOp = [
    'chat',
    'generate_content',
    'text_completion',
    'embeddings',
    'completion',
    'classify',
  ].includes(normalizedOperation);

  if (hasModel || hasSystem || hasTokens || isGenAiOp) return 'llm';
  return null;
}

function hasGenAiAttributes(attributes: AttributesLike): boolean {
  if (!attributes) return false;
  return attributes.some(attr => typeof attr.key === 'string' && attr.key.startsWith('gen_ai.'));
}

export function isGenAiSpan(attributes: AttributesLike, spanName?: string): boolean {
  return getGenAiSpanKind(attributes, spanName) !== null || hasGenAiAttributes(attributes);
}

export function formatTokenCount(totalTokens?: number): string | null {
  if (totalTokens == null) return null;
  if (totalTokens < 0) return null;
  return new Intl.NumberFormat('en-US').format(totalTokens);
}
