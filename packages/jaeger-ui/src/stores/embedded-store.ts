// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

// URL-driven embedded UI flags (`?uiEmbed=v0&...`). Parsed once per page load - same
// behavior as the former Redux `embedded` reducer (no actions, no updates).

import _flatMap from 'lodash/flatMap';
import queryString from 'query-string';

import { EmbeddedState } from '../types/embedded';

function getStrings(value: string): string;
function getStrings(value: object): string[];
function getStrings(value: string | object): string | string[] {
  return typeof value === 'string' ? value : _flatMap(value, getStrings);
}

const VALUE_ENABLED = '1';
const VERSION_0 = 'v0';

// uiEmbed=v0
// uiSearchHideGraph=1
// uiTimelineCollapseTitle=1
// uiTimelineHideMinimap=1
// uiTimelineHideSummary=1
const STATE_PARAMS_V0 = {
  searchHideGraph: 'uiSearchHideGraph',
  timeline: {
    collapseTitle: 'uiTimelineCollapseTitle',
    hideMinimap: 'uiTimelineHideMinimap',
    hideSummary: 'uiTimelineHideSummary',
  },
};

const PARAM_KEYS_V0 = getStrings(STATE_PARAMS_V0);

export function getEmbeddedState(search: string): null | EmbeddedState {
  const { uiEmbed, ...rest } = queryString.parse(search);
  if (uiEmbed !== VERSION_0) {
    return null;
  }
  return {
    version: VERSION_0,
    searchHideGraph: rest[STATE_PARAMS_V0.searchHideGraph] === VALUE_ENABLED,
    timeline: {
      collapseTitle: rest[STATE_PARAMS_V0.timeline.collapseTitle] === VALUE_ENABLED,
      hideMinimap: rest[STATE_PARAMS_V0.timeline.hideMinimap] === VALUE_ENABLED,
      hideSummary: rest[STATE_PARAMS_V0.timeline.hideSummary] === VALUE_ENABLED,
    },
  };
}

export function stripEmbeddedState(state: Record<string, any>) {
  const { uiEmbed = undefined, ...rv } = state;
  if (uiEmbed === VERSION_0) {
    PARAM_KEYS_V0.forEach(Reflect.deleteProperty.bind(null, rv));
  }
  return rv;
}

// undefined -> cache not initialize yet (first call).
// null -> initialized; URL says we are not in uiEmbed=v0
// EmbeddedState -> initialized; embedded mode on.
let cached: EmbeddedState | null | undefined;

export function useEmbeddedState(): EmbeddedState | null {
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
