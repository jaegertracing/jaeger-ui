// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IconType } from 'react-icons';
import { IoSparkles, IoServer, IoGlobe, IoChatbubble, IoCodeSlash } from 'react-icons/io5';

import type { IAttribute } from '../types/otel';

// Priority: lower index wins when a span has attributes from multiple namespaces.
const NAMESPACE_PRIORITY: Record<string, number> = {
  gen_ai: 0,
  db: 1,
  http: 2,
  messaging: 3,
  rpc: 4,
};

const NAMESPACE_ICON: Record<string, IconType> = {
  gen_ai: IoSparkles,
  db: IoServer,
  http: IoGlobe,
  messaging: IoChatbubble,
  rpc: IoCodeSlash,
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
    if (priority !== undefined && priority < bestPriority) {
      bestPriority = priority;
      bestIcon = NAMESPACE_ICON[ns];
      if (bestPriority === 0) break;
    }
  }
  return bestIcon;
}
