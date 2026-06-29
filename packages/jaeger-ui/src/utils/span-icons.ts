// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IconType } from 'react-icons';
import {
  IoSparkles as GenAiIcon,
  IoServer as DbIcon,
  IoGlobe as HttpIcon,
  IoChatbubble as MessagingIcon,
  IoSwapHorizontalOutline as RpcIcon,
} from 'react-icons/io5';

import type { IAttribute } from '../types/otel';

// Priority: lower index wins when a span has attributes from multiple namespaces.
const NAMESPACE_PRIORITY: Partial<Record<string, number>> = {
  gen_ai: 0,
  db: 1,
  http: 2,
  messaging: 3,
  rpc: 4,
};

export const NAMESPACE_ICON: Partial<Record<string, IconType>> = {
  gen_ai: GenAiIcon,
  db: DbIcon,
  http: HttpIcon,
  messaging: MessagingIcon,
  rpc: RpcIcon,
};

export function getSpanIconComponent(attributes: IAttribute[] | undefined): IconType | null {
  if (!attributes) return null;
  let bestPriority = Infinity;
  let bestIcon: IconType | null = null;
  for (const { key } of attributes) {
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
