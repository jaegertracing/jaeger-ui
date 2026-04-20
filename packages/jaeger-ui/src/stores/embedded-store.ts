// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// URL-driven embedded UI flags (`?uiEmbed=v0&...`). Parsed once per page load - same
// behavior as the former Redux `embedded` reducer (no actions, no updates).

import { EmbeddedState } from '../types/embedded';
import { getEmbeddedState } from '../utils/embedded-url';

let cached: EmbeddedState | null | undefined;

export function getEmbeddedFromUrl(): EmbeddedState | null {
  if (cached !== undefined) {
    return cached;
  }
  if (typeof window === 'undefined') {
    cached = null;
    return cached;
  }
  const search = window.location.search;
  cached = search ? getEmbeddedState(search) : null;
  return cached;
}

// Resets the lazy cache (Vitest only).
export function resetEmbeddedFromUrlCacheForTests(): void {
  cached = undefined;
}
