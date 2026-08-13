// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IconType } from 'react-icons';
import {
  IoServer as DbIcon,
  IoGlobe as HttpIcon,
  IoChatbubble as MessagingIcon,
  IoSwapHorizontalOutline as RpcIcon,
} from 'react-icons/io5';
import {
  MdSmartToy as AgentIcon,
  MdBuild as ToolCallIcon,
  MdStorage as RetrievalIcon,
  MdAutoAwesome as GenericGenAIIcon,
} from 'react-icons/md';
import { RiGraduationCapFill as LLMCallIcon } from 'react-icons/ri';

import { GEN_AI_REQUEST_MODEL } from '../../../constants/span-attributes';
import type { GenAISpanKind, IAttributes } from '../../../types/otel';

/**
 * Shared span decoration registry.
 *
 * Icons and pills derive signals from the same attribute keys; they only differ
 * in outcome:
 * - icon: namespace presence or GenAI kind → one category glyph
 * - pill: specific keys → attribute value (only when it adds info the icon cannot)
 *
 * GenAI kind icons and namespace icons share one resolver ({@link getSpanDecorationIcon});
 * GenAI wins when both would match (#4217).
 */

export type IPillSource = {
  label: string;
  attrKeys: readonly string[];
  isError?: (value: string) => boolean;
};

export type INamespaceIcon = {
  namespace: string;
  icon: IconType;
  /** Lower wins when a span matches multiple namespaces. */
  priority: number;
};

export type ISpanDecorationIcon = {
  icon: IconType;
  /** Present for GenAI kinds (tooltip / aria-label). */
  label?: string;
  isGenAI: boolean;
};

/** Flat namespace → icon list (priority order). No gen_ai entry — GenAI uses kind icons. */
export const NAMESPACE_ICONS: readonly INamespaceIcon[] = [
  { namespace: 'db', icon: DbIcon, priority: 1 },
  { namespace: 'http', icon: HttpIcon, priority: 2 },
  { namespace: 'messaging', icon: MessagingIcon, priority: 3 },
  { namespace: 'rpc', icon: RpcIcon, priority: 4 },
];

/**
 * Pill sources in emission order. Value-bearing only — no category-only pills
 * (e.g. span.kind). messaging.system is a follow-up.
 */
export const PILL_SOURCES: readonly IPillSource[] = [
  {
    label: 'http.status_code',
    attrKeys: ['http.status_code', 'http.response.status_code'],
    isError: value => {
      const code = Number(value.trim());
      return code >= 500 && code < 600;
    },
  },
  {
    label: 'http.method',
    attrKeys: ['http.method', 'http.request.method'],
  },
  { label: 'db.system', attrKeys: ['db.system.name', 'db.system'] },
  { label: 'rpc.system', attrKeys: ['rpc.system.name', 'rpc.system'] },
  { label: GEN_AI_REQUEST_MODEL, attrKeys: [GEN_AI_REQUEST_MODEL] },
];

/**
 * OTel gen_ai.operation.name → UI kind. Single source of truth for classifySpan
 * and GenAI icon selection.
 */
export const GEN_AI_OPERATION_TO_KIND: Partial<Record<string, GenAISpanKind>> = {
  chat: 'LLM_CALL',
  text_completion: 'LLM_CALL',
  generate_content: 'LLM_CALL',
  embeddings: 'LLM_CALL',
  execute_tool: 'TOOL_CALL',
  invoke_agent: 'AGENT',
  create_agent: 'AGENT',
  invoke_workflow: 'AGENT',
  retrieval: 'RETRIEVAL',
};

/** Kind → icon + label for timeline GenAI decorations. */
export const GEN_AI_KIND_META: Record<GenAISpanKind, { icon: IconType; label: string }> = {
  AGENT: { icon: AgentIcon, label: 'AI Agent' },
  LLM_CALL: { icon: LLMCallIcon, label: 'LLM call' },
  TOOL_CALL: { icon: ToolCallIcon, label: 'MCP Tool call' },
  RETRIEVAL: { icon: RetrievalIcon, label: 'Retrieval' },
  UNKNOWN_GENAI: { icon: GenericGenAIIcon, label: 'GenAI span' },
};

const NAMESPACE_PRIORITY: Partial<Record<string, number>> = Object.fromEntries(
  NAMESPACE_ICONS.map(({ namespace, priority }) => [namespace, priority])
);

const NAMESPACE_ICON: Partial<Record<string, IconType>> = Object.fromEntries(
  NAMESPACE_ICONS.map(({ namespace, icon }) => [namespace, icon])
);

/** Namespace-only icon from attributes (ignores GenAI). Prefer {@link getSpanDecorationIcon}. */
export function getNamespaceIconComponent(attributes: IAttributes | undefined): IconType | null {
  if (!attributes) return null;
  let bestPriority = Infinity;
  let bestIcon: IconType | null = null;
  for (const key of attributes.keys()) {
    const dotIdx = key.indexOf('.');
    if (dotIdx === -1) continue;
    const ns = key.slice(0, dotIdx);
    const priority = NAMESPACE_PRIORITY[ns];
    const icon = NAMESPACE_ICON[ns];
    if (priority !== undefined && icon !== undefined && priority < bestPriority) {
      bestPriority = priority;
      bestIcon = icon;
      if (bestPriority === 0) break;
    }
  }
  return bestIcon;
}

/**
 * Single icon for a span row. GenAI kind beats namespace icons so http+gen_ai
 * spans never show two glyphs (#4217).
 */
export function getSpanDecorationIcon(span: {
  attributes?: IAttributes;
  genAIKind?: GenAISpanKind;
}): ISpanDecorationIcon | null {
  if (span.genAIKind !== undefined) {
    const meta = GEN_AI_KIND_META[span.genAIKind] ?? GEN_AI_KIND_META.UNKNOWN_GENAI;
    return { icon: meta.icon, label: meta.label, isGenAI: true };
  }
  const icon = getNamespaceIconComponent(span.attributes);
  if (!icon) return null;
  return { icon, isGenAI: false };
}
