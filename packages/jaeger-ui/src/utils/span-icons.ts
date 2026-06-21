// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IconType } from 'react-icons';
import { IoSparkles, IoServer, IoGlobe, IoChatbubble, IoCodeSlash } from 'react-icons/io5';

import type { IAttribute } from '../types/otel';

const ATTR_ICON_RULES: { prefix: string; icon: IconType }[] = [
  { prefix: 'gen_ai.', icon: IoSparkles },
  { prefix: 'db.', icon: IoServer },
  { prefix: 'http.', icon: IoGlobe },
  { prefix: 'messaging.', icon: IoChatbubble },
  { prefix: 'rpc.', icon: IoCodeSlash },
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
