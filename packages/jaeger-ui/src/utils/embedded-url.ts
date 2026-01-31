// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import _flatMap from 'lodash/flatMap';
import queryString from 'query-string';

import { EmbeddedState } from '../types/embedded';

function getStrings(value: string): string;
function getStrings(value: object): string[];
function getStrings(value: string | object): string | string[] {
  return typeof value === 'string' ? value : _flatMap(value, getStrings);
}

const VALUE_ENABLED = '1';
export const VERSION_0 = 'v0';

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
