// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { IAttribute, IOtelSpan, SpanKind } from '../types/otel';

export enum SpanType {
  Database = 'database',
  GenAI = 'genai',
  MCP = 'mcp',
  Messaging = 'messaging',
  RPC = 'rpc',
  HTTP = 'http',
}

export interface ISpanClassification {
  type: SpanType;
  label: string;
}

const DATABASE_ATTRIBUTE_KEYS = new Set(['db.system', 'db.name', 'db.statement', 'db.type']);

const MCP_ATTRIBUTE_KEYS = new Set(['mcp.tool.name', 'mcp.method', 'gen_ai.tool.name']);

const MESSAGING_ATTRIBUTE_KEYS = new Set(['messaging.system', 'messaging.destination.name']);

const HTTP_ATTRIBUTE_KEYS = new Set(['http.method', 'http.request.method', 'url.full']);

const RPC_ATTRIBUTE_KEYS = new Set(['rpc.system', 'rpc.service']);

export function getAttribute(span: IOtelSpan, key: string): IAttribute | undefined {
  return span.attributes.find(attribute => attribute.key === key);
}

export function hasAttributePrefix(span: IOtelSpan, prefix: string): boolean {
  return span.attributes.some(attribute => attribute.key.startsWith(prefix));
}

function hasMcpOperationName(span: IOtelSpan): boolean {
  const operationName = span.name.toLowerCase();
  return operationName.includes('mcp') && operationName.includes('tool');
}

export function classifySpan(span: IOtelSpan): ISpanClassification | null {
  let hasDatabaseAttribute = false;
  let hasMcpAttribute = false;
  let hasGenAIAttribute = false;
  let hasMessagingAttribute = false;
  let hasHttpAttribute = false;
  let hasRpcAttribute = false;

  for (const attribute of span.attributes) {
    const { key } = attribute;
    hasDatabaseAttribute ||= DATABASE_ATTRIBUTE_KEYS.has(key);
    hasMcpAttribute ||= MCP_ATTRIBUTE_KEYS.has(key);
    hasGenAIAttribute ||= key.startsWith('gen_ai.') || key.startsWith('llm.');
    hasMessagingAttribute ||= MESSAGING_ATTRIBUTE_KEYS.has(key);
    hasHttpAttribute ||= HTTP_ATTRIBUTE_KEYS.has(key);
    hasRpcAttribute ||= RPC_ATTRIBUTE_KEYS.has(key);
  }

  if (hasMcpAttribute || hasMcpOperationName(span)) {
    return { type: SpanType.MCP, label: 'MCP tool call' };
  }

  if (hasGenAIAttribute) {
    return { type: SpanType.GenAI, label: 'GenAI step' };
  }

  if (hasDatabaseAttribute) {
    return { type: SpanType.Database, label: 'Database call' };
  }

  if (hasMessagingAttribute) {
    return { type: SpanType.Messaging, label: 'Messaging span' };
  }

  if (hasHttpAttribute) {
    return { type: SpanType.HTTP, label: 'HTTP span' };
  }

  if (hasRpcAttribute || span.kind === SpanKind.CLIENT || span.kind === SpanKind.SERVER) {
    return { type: SpanType.RPC, label: 'RPC span' };
  }

  return null;
}
