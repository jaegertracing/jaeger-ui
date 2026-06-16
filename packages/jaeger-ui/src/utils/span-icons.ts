// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import type { IconType } from 'react-icons';
import { IoSparkles, IoServer, IoGlobe, IoChatbubble, IoCodeSlash } from 'react-icons/io5';

import { IAttribute } from '../types/otel';

const ATTR_ICON_RULES: [prefix: string, icon: IconType][] = [
  ['gen_ai.', IoSparkles],
  ['db.', IoServer],
  ['http.', IoGlobe],
  ['messaging.', IoChatbubble],
  ['rpc.', IoCodeSlash],
];

export function getSpanIconComponent(attributes: IAttribute[] | undefined): IconType | null {
  for (const [prefix, icon] of ATTR_ICON_RULES) {
    if (attributes?.some(a => a.key.startsWith(prefix))) {
      return icon;
    }
  }
  return null;
}
