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

function hasAnyAttribute(span: IOtelSpan, keys: ReadonlySet<string>): boolean {
  return span.attributes.some(attribute => keys.has(attribute.key));
}

function hasMcpOperationName(span: IOtelSpan): boolean {
  const operationName = span.name.toLowerCase();
  return operationName.includes('mcp') && operationName.includes('tool');
}

export function classifySpan(span: IOtelSpan): ISpanClassification | null {
  if (hasAnyAttribute(span, MCP_ATTRIBUTE_KEYS) || hasMcpOperationName(span)) {
    return { type: SpanType.MCP, label: 'MCP tool call' };
  }

  if (hasAttributePrefix(span, 'gen_ai.') || hasAttributePrefix(span, 'llm.')) {
    return { type: SpanType.GenAI, label: 'GenAI step' };
  }

  if (hasAnyAttribute(span, DATABASE_ATTRIBUTE_KEYS)) {
    return { type: SpanType.Database, label: 'Database call' };
  }

  if (hasAnyAttribute(span, MESSAGING_ATTRIBUTE_KEYS)) {
    return { type: SpanType.Messaging, label: 'Messaging span' };
  }

  if (hasAnyAttribute(span, HTTP_ATTRIBUTE_KEYS)) {
    return { type: SpanType.HTTP, label: 'HTTP span' };
  }

  if (
    hasAnyAttribute(span, RPC_ATTRIBUTE_KEYS) ||
    span.kind === SpanKind.CLIENT ||
    span.kind === SpanKind.SERVER
  ) {
    return { type: SpanType.RPC, label: 'RPC span' };
  }

  return null;
}
