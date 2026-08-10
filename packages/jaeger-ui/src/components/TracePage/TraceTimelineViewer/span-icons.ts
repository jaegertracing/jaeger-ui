// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IconType } from 'react-icons';
import {
  IoServer as DbIcon,
  IoGlobe as HttpIcon,
  IoChatbubble as MessagingIcon,
  IoSwapHorizontalOutline as RpcIcon,
} from 'react-icons/io5';

import type { IAttributes } from '../../../types/otel';

// gen_ai is deliberately not a namespace here: GenAISpanIcon already renders one
// icon per GenAI span, classified by operation kind (agent/LLM call/tool call/
// retrieval, falling back to a generic GenAI icon for an unclassified operation -
// see classifySpan). A second, generic gen_ai entry in this map would render
// alongside it on every GenAI span, which is exactly the redundant/confusing
// double-icon rendering reported in #4217.
//
// Priority: lower index wins when a span has attributes from multiple namespaces.
const NAMESPACE_PRIORITY: Partial<Record<string, number>> = {
  db: 1,
  http: 2,
  messaging: 3,
  rpc: 4,
};

const NAMESPACE_ICON: Partial<Record<string, IconType>> = {
  db: DbIcon,
  http: HttpIcon,
  messaging: MessagingIcon,
  rpc: RpcIcon,
};

export function getSpanIconComponent(attributes: IAttributes | undefined): IconType | null {
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
