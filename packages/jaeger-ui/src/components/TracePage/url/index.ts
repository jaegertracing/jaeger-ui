// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import queryString from 'query-string';

import prefixUrl from '../../../utils/prefix-url';

import type { LocationState } from '../../../types';
import type { SpanDetailPanelMode } from '../../../types/config';

export const ROUTE_PATH = prefixUrl('/trace/:id');

export type UrlLayoutSettings = {
  timelineBarsVisible: boolean | null;
  detailPanelMode: SpanDetailPanelMode | null;
};

const layoutParamNames = {
  timelineBarsVisible: 'timeline',
  detailPanelMode: 'sidebar',
} as const;

export function parseLayoutSettingsFromUrl(search: string): UrlLayoutSettings {
  const params = queryString.parse(search);
  const timeline = Array.isArray(params.timeline) ? params.timeline[0] : params.timeline;
  const sidebar = Array.isArray(params.sidebar) ? params.sidebar[0] : params.sidebar;
  return {
    timelineBarsVisible: timeline === 'on' ? true : timeline === 'off' ? false : null,
    detailPanelMode: sidebar === 'inline' || sidebar === 'sidepanel' ? sidebar : null,
  };
}

export function stringifyLayoutSettings(settings: Partial<UrlLayoutSettings>): Record<string, string> {
  const params: Record<string, string> = {};
  if (settings.timelineBarsVisible != null) {
    params.timeline = settings.timelineBarsVisible ? 'on' : 'off';
  }
  if (settings.detailPanelMode != null) params.sidebar = settings.detailPanelMode;
  return params;
}

// Preserve whether the caller supplied a leading question mark.
// Removing a parameter sorts the remaining keys and normalizes their encoding.
// If no targeted parameter is present, return the original query unchanged.
function stripLayoutParams(search: string, names: readonly string[]): string {
  const params = queryString.parse(search);
  if (!names.some(name => Object.hasOwn(params, name))) return search;
  names.forEach(name => delete params[name]);
  const result = queryString.stringify(params);
  return result && search.startsWith('?') ? `?${result}` : result;
}

export function stripLayoutSettings(search: string): string {
  return stripLayoutParams(search, Object.values(layoutParamNames));
}

// A manual toggle clears only its own URL override.
export function stripLayoutSettingParam(search: string, key: keyof UrlLayoutSettings): string {
  return stripLayoutParams(search, [layoutParamNames[key]]);
}

function buildTraceQuery(uiFind?: string, settings?: Partial<UrlLayoutSettings>): string {
  return queryString.stringify({
    ...(uiFind ? { uiFind } : {}),
    ...(settings ? stringifyLayoutSettings(settings) : {}),
  });
}

export function getUrl(id: string, uiFind?: string, settings?: Partial<UrlLayoutSettings>): string {
  const traceUrl = prefixUrl(`/trace/${encodeURIComponent(id)}`);
  const search = buildTraceQuery(uiFind, settings);
  return search ? `${traceUrl}?${search}` : traceUrl;
}

// Navigation descriptor for links that point to the trace page.
// Distinct from React Router's Location, which represents where you currently are.
export type TracePageLink = {
  // URL path to the trace page, e.g. /trace/abc123
  pathname: string;
  // Raw query string without the leading '?'. Absent when there are no search or layout parameters.
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
  const link: TracePageLink = { state, pathname: getUrl(id) };
  const search = buildTraceQuery(uiFind, settings);
  if (search) link.search = search;
  return link;
}
