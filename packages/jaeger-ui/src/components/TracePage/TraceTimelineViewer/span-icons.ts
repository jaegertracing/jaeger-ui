// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IconType } from 'react-icons';

import type { IAttributes } from '../../../types/otel';
import { NAMESPACE_ICONS } from './spanDecorations';

// Priority / icon maps derived from the shared decoration registry.
// gen_ai is deliberately not in that registry: GenAISpanIcon already renders one
// icon per GenAI span via classifySpan (#4217).
const NAMESPACE_PRIORITY: Partial<Record<string, number>> = Object.fromEntries(
  NAMESPACE_ICONS.map(({ namespace, priority }) => [namespace, priority])
);

const NAMESPACE_ICON: Partial<Record<string, IconType>> = Object.fromEntries(
  NAMESPACE_ICONS.map(({ namespace, icon }) => [namespace, icon])
);

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
