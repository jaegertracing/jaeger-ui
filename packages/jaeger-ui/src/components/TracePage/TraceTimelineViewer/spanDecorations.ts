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
import type { AttributeValue, GenAISpanKind, IAttributes, IOtelSpan } from '../../../types/otel';

/**
 * Shared span decoration registry (#4223).
 *
 * One entry per attribute namespace owns both outcomes (icon and/or pills). List
 * position is the only ordering: first matching entry with an icon wins; pills
 * emit in list order (and within an entry, in that entry's pills order).
 *
 * GenAI kind icons are a second axis ({@link GEN_AI_KIND_META}): classification
 * happens at transform time via classifySpan; the resolver prefers genAIKind
 * over namespace icons (#4217). The gen_ai registry row has pills only.
 */

export type IPillSource = {
  label: string;
  attrKeys: readonly string[];
  isError?: (value: string) => boolean;
};

export type ISpanDecoration = {
  namespace: string;
  icon?: IconType;
  pills?: readonly IPillSource[];
};

export type ISpanPill = { label: string; value: string; isError?: boolean };

export type ISpanDecorationIcon = {
  icon: IconType;
  /** Present for GenAI kinds (tooltip / aria-label). */
  label?: string;
};

function is5xx(value: string): boolean {
  const code = Number(value.trim());
  return code >= 500 && code < 600;
}

export const SPAN_DECORATIONS: readonly ISpanDecoration[] = [
  {
    namespace: 'db',
    icon: DbIcon,
    pills: [{ label: 'db.system', attrKeys: ['db.system.name', 'db.system'] }],
  },
  {
    namespace: 'http',
    icon: HttpIcon,
    pills: [
      {
        label: 'http.status_code',
        attrKeys: ['http.status_code', 'http.response.status_code'],
        isError: is5xx,
      },
      {
        label: 'http.method',
        attrKeys: ['http.method', 'http.request.method'],
      },
    ],
  },
  { namespace: 'messaging', icon: MessagingIcon },
  {
    namespace: 'rpc',
    icon: RpcIcon,
    pills: [{ label: 'rpc.system', attrKeys: ['rpc.system.name', 'rpc.system'] }],
  },
  {
    namespace: 'gen_ai',
    pills: [{ label: GEN_AI_REQUEST_MODEL, attrKeys: [GEN_AI_REQUEST_MODEL] }],
  },
];

/** Kind → icon + label for timeline GenAI decorations. */
export const GEN_AI_KIND_META: Record<GenAISpanKind, { icon: IconType; label: string }> = {
  AGENT: { icon: AgentIcon, label: 'AI Agent' },
  LLM_CALL: { icon: LLMCallIcon, label: 'LLM call' },
  TOOL_CALL: { icon: ToolCallIcon, label: 'MCP Tool call' },
  RETRIEVAL: { icon: RetrievalIcon, label: 'Retrieval' },
  UNKNOWN_GENAI: { icon: GenericGenAIIcon, label: 'GenAI span' },
};

function safeStringify(value: object): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

function formatAttributeValue(value: AttributeValue): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Uint8Array) {
    return safeStringify(Array.from(value));
  }
  if (Array.isArray(value)) {
    return safeStringify(value);
  }
  if (typeof value === 'object') {
    return safeStringify(value);
  }
  return String(value);
}

function pillFromSource(span: IOtelSpan, source: IPillSource): ISpanPill | undefined {
  for (const key of source.attrKeys) {
    const attrValue = span.attributes.getValue(key);
    if (attrValue == null) {
      continue;
    }
    const value = formatAttributeValue(attrValue).trim();
    if (!value) {
      continue;
    }
    const pill: ISpanPill = { label: source.label, value };
    if (source.isError?.(value)) {
      pill.isError = true;
    }
    return pill;
  }
  return undefined;
}

function namespaceIconFromAttributes(attributes: IAttributes | undefined): IconType | null {
  if (!attributes) return null;
  const matched = new Set<string>();
  for (const key of attributes.keys()) {
    const dotIdx = key.indexOf('.');
    if (dotIdx === -1) continue;
    matched.add(key.slice(0, dotIdx));
  }
  for (const entry of SPAN_DECORATIONS) {
    if (entry.icon && matched.has(entry.namespace)) {
      return entry.icon;
    }
  }
  return null;
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
    return { icon: meta.icon, label: meta.label };
  }
  const icon = namespaceIconFromAttributes(span.attributes);
  if (!icon) return null;
  return { icon };
}

/** Builds pills for a single span from {@link SPAN_DECORATIONS} in list order. */
export function getSpanPillsForSpan(span: IOtelSpan): ISpanPill[] {
  const pills: ISpanPill[] = [];
  for (const entry of SPAN_DECORATIONS) {
    for (const source of entry.pills ?? []) {
      const pill = pillFromSource(span, source);
      if (pill) {
        pills.push(pill);
      }
    }
  }
  return pills;
}
