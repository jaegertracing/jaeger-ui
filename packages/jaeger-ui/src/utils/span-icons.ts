// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IconType } from 'react-icons';
import { IoSparkles, IoServer, IoGlobe, IoChatbubble, IoCodeSlash } from 'react-icons/io5';

import { SpanAttributeNamespace } from '../constants/span-attributes';
import type { IAttribute } from '../types/otel';

const ATTR_ICON_RULES: { prefix: SpanAttributeNamespace; icon: IconType }[] = [
  { prefix: SpanAttributeNamespace.GEN_AI, icon: IoSparkles },
  { prefix: SpanAttributeNamespace.DB, icon: IoServer },
  { prefix: SpanAttributeNamespace.HTTP, icon: IoGlobe },
  { prefix: SpanAttributeNamespace.MESSAGING, icon: IoChatbubble },
  { prefix: SpanAttributeNamespace.RPC, icon: IoCodeSlash },
];

export function getSpanIconComponent(attributes: IAttribute[] | undefined): IconType | null {
  if (!attributes) return null;
  let bestIndex = ATTR_ICON_RULES.length;
  for (const attr of attributes) {
    for (let i = 0; i < bestIndex; i++) {
      if (attr.key.startsWith(ATTR_ICON_RULES[i].prefix)) {
        bestIndex = i;
        break;
      }
    }
    if (bestIndex === 0) break;
  }
  return bestIndex < ATTR_ICON_RULES.length ? ATTR_ICON_RULES[bestIndex].icon : null;
}
