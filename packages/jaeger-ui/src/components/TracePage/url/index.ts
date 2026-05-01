// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import queryString from 'query-string';

import prefixUrl from '../../../utils/prefix-url';

import { TNil, LocationState } from '../../../types';
import type { SpanDetailPanelMode } from '../../../types/config';

export const ROUTE_PATH = prefixUrl('/trace/:id');

const URL_PARAM_TIMELINE = 'timeline';
const URL_PARAM_SIDEBAR = 'sidebar';

const SETTINGS_URL_PARAMS = [URL_PARAM_TIMELINE, URL_PARAM_SIDEBAR];

export type UrlLayoutSettings = {
  timelineBarsVisible: boolean | null;
  detailPanelMode: SpanDetailPanelMode | null;
};

/**
 * Converts layout settings into query parameters.
 */
export function stringifySettings(settings: Partial<UrlLayoutSettings>): Record<string, string> {
  const params: Record<string, string> = {};
  if (settings.timelineBarsVisible === true) params[URL_PARAM_TIMELINE] = 'on';
  if (settings.timelineBarsVisible === false) params[URL_PARAM_TIMELINE] = 'off';
  if (settings.detailPanelMode) params[URL_PARAM_SIDEBAR] = settings.detailPanelMode;
  return params;
}

/**
 * Removes layout settings from a search string.
 * This is used to "rebase" the URL back to its base state (preserving other params like uiFind).
 */
export function rebaseSettings(search: string): string {
  const params = queryString.parse(search);
  SETTINGS_URL_PARAMS.forEach(p => delete params[p]);
  const newSearch = queryString.stringify(params);
  return newSearch ? `?${newSearch}` : '';
}

export function getUrl(id: string, uiFind?: string, settings?: Partial<UrlLayoutSettings>): string {
  const traceUrl = prefixUrl(`/trace/${id}`);
  const params = {
    ...(uiFind ? { uiFind } : {}),
    ...(settings ? stringifySettings(settings) : {}),
  };

  const search = queryString.stringify(params);
  return search ? `${traceUrl}?${search}` : traceUrl;
}

// Navigation descriptor for links that point to the trace page.
// Distinct from React Router's Location, which represents where you currently are.
export type TracePageLink = {
  // URL path to the trace page, e.g. /trace/abc123
  pathname: string;
  // Raw query string without the leading '?', e.g. 'uiFind=foo'. Absent when not filtering spans.
  search?: string;
  // Out-of-band router state, not visible in the URL.
  // Currently carries fromSearch so TracePageHeader can render the back-to-search button.
  state?: LocationState;
};

export function getTracePageLink(
  id: string,
  state?: LocationState,
  uiFind?: string,
  settings?: Partial<UrlLayoutSettings>
): TracePageLink {
  const pathname = prefixUrl(`/trace/${id}`);
  const params = {
    ...(uiFind ? { uiFind } : {}),
    ...(settings ? stringifySettings(settings) : {}),
  };
  const search = queryString.stringify(params);
  return { state, pathname, ...(search ? { search } : {}) };
}

export function parseSettingsFromUrl(search: string): UrlLayoutSettings {
  const params = queryString.parse(search);

  let timelineBarsVisible: boolean | null = null;
  const timelineParam = params[URL_PARAM_TIMELINE];
  if (timelineParam === 'off') timelineBarsVisible = false;
  else if (timelineParam === 'on') timelineBarsVisible = true;

  let detailPanelMode: SpanDetailPanelMode | null = null;
  const sidebarParam = params[URL_PARAM_SIDEBAR];
  if (sidebarParam === 'sidepanel') detailPanelMode = 'sidepanel';
  else if (sidebarParam === 'inline') detailPanelMode = 'inline';

  return { timelineBarsVisible, detailPanelMode };
}
