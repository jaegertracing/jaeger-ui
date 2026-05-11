// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import queryString from 'query-string';

import prefixUrl from '../../../utils/prefix-url';

import type { LocationState } from '../../../types';
import type { SpanDetailPanelMode } from '../../../types/config';

export const ROUTE_PATH = prefixUrl('/trace/:id');

const URL_PARAM_TIMELINE = 'timeline';
const URL_PARAM_SIDEBAR = 'sidebar';

/** @public */
export type UrlLayoutSettings = {
  timelineBarsVisible: boolean | null;
  detailPanelMode: SpanDetailPanelMode | null;
};

/**
 * Maps each UrlLayoutSettings key to its URL query-parameter name.
 * Using an explicit Record ensures a compile-time error if a new key is added
 * to UrlLayoutSettings without also adding it here.
 */
const SETTINGS_PARAM_NAMES: Record<keyof UrlLayoutSettings, string> = {
  timelineBarsVisible: URL_PARAM_TIMELINE,
  detailPanelMode: URL_PARAM_SIDEBAR,
};

const LAYOUT_PARAM_NAMES = [URL_PARAM_TIMELINE, URL_PARAM_SIDEBAR];

/**
 * Maps each valid SpanDetailPanelMode to its URL query-parameter value.
 * Typed as Record<SpanDetailPanelMode, string> so that adding a new mode
 * to the type produces a compile-time error here, preventing silent drops
 * in both stringifyLayoutSettings (write) and parseLayoutSettingsFromUrl (read).
 */
const SIDEBAR_PARAM_VALUES: Record<SpanDetailPanelMode, string> = {
  inline: 'inline',
  sidepanel: 'sidepanel',
};

/**
 * Reverse lookup: URL param value → SpanDetailPanelMode.
 * Built with Object.create(null) (null prototype) so that the `in` operator is safe:
 * prototype-inherited names like toString/hasOwnProperty can never match a real mode.
 */
const SIDEBAR_URL_VALUE_TO_MODE: Record<string, SpanDetailPanelMode> = Object.create(null);
for (const [mode, urlValue] of Object.entries(SIDEBAR_PARAM_VALUES) as [SpanDetailPanelMode, string][]) {
  SIDEBAR_URL_VALUE_TO_MODE[urlValue] = mode;
}

/**
 * Converts layout settings into URL query parameters.
 */
export function stringifyLayoutSettings(settings: Partial<UrlLayoutSettings>): Record<string, string> {
  const params: Record<string, string> = {};
  if (settings.timelineBarsVisible === true) params[URL_PARAM_TIMELINE] = 'on';
  if (settings.timelineBarsVisible === false) params[URL_PARAM_TIMELINE] = 'off';
  if (settings.detailPanelMode) {
    params[URL_PARAM_SIDEBAR] = SIDEBAR_PARAM_VALUES[settings.detailPanelMode];
  }
  return params;
}

/**
 * Strips all layout setting params (?timeline, ?sidebar) from a URL search string,
 * preserving unrelated params such as ?uiFind.
 * Parses and stringifies the query string once regardless of how many layout
 * params are present. The output is canonicalized (param order and encoding
 * may differ from the original string).
 * Used when a caller needs a clean base URL without any layout overrides.
 */
export function stripLayoutSettings(search: string): string {
  const params = queryString.parse(search);
  if (!LAYOUT_PARAM_NAMES.some(p => p in params)) return search; // no layout params — no churn
  for (const p of LAYOUT_PARAM_NAMES) delete params[p];
  const newSearch = queryString.stringify(params);
  if (!newSearch) return '';
  return search.startsWith('?') ? `?${newSearch}` : newSearch;
}

/**
 * Removes a single layout setting param from a search string, preserving all others.
 * Used when the user toggles a setting — only the acted-on param is stripped,
 * so other URL overrides (e.g. ?sidebar=sidepanel) remain intact.
 * Note: when a param is removed the output is canonicalized — param order and
 * percent-encoding may differ from the original string. Callers doing textual
 * URL comparison (e.g. history dedup) should compare parsed representations, not strings.
 */
export function stripLayoutSettingParam(search: string, key: keyof UrlLayoutSettings): string {
  const paramName = SETTINGS_PARAM_NAMES[key];
  const params = queryString.parse(search);
  if (!(paramName in params)) return search; // param absent — no change, no stringify churn
  delete params[paramName];
  const newSearch = queryString.stringify(params);
  if (!newSearch) return '';
  // Preserve the leading '?' only if the input had one.
  return search.startsWith('?') ? `?${newSearch}` : newSearch;
}

/** Builds the shared query-param object for trace page URLs. */
function buildTraceQueryParams(
  uiFind?: string,
  settings?: Partial<UrlLayoutSettings>
): Record<string, string> {
  return {
    ...(uiFind ? { uiFind } : {}),
    ...(settings ? stringifyLayoutSettings(settings) : {}),
  };
}

export function getUrl(id: string, uiFind?: string, settings?: Partial<UrlLayoutSettings>): string;
export function getUrl(
  id: string,
  options?: { uiFind?: string; settings?: Partial<UrlLayoutSettings> }
): string;
export function getUrl(
  id: string,
  uiFindOrOptions?: string | { uiFind?: string; settings?: Partial<UrlLayoutSettings> },
  settings?: Partial<UrlLayoutSettings>
): string {
  let uiFind: string | undefined;
  let layoutSettings: Partial<UrlLayoutSettings> | undefined = settings;

  if (typeof uiFindOrOptions === 'object' && uiFindOrOptions !== null) {
    uiFind = uiFindOrOptions.uiFind;
    layoutSettings = uiFindOrOptions.settings;
  } else {
    uiFind = uiFindOrOptions;
  }

  const traceUrl = prefixUrl(`/trace/${id}`);
  const search = queryString.stringify(buildTraceQueryParams(uiFind, layoutSettings));
  return search ? `${traceUrl}?${search}` : traceUrl;
}

// Navigation descriptor for links that point to the trace page.
// Distinct from React Router's Location, which represents where you currently are.
export type TracePageLink = {
  // URL path to the trace page, e.g. /trace/abc123
  pathname: string;
  // Raw query string without the leading '?', e.g. 'uiFind=foo&timeline=off'.
  // Present when filtering spans (uiFind) or when layout settings are encoded in the link.
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
): TracePageLink;
export function getTracePageLink(
  id: string,
  options?: { state?: LocationState; uiFind?: string; settings?: Partial<UrlLayoutSettings> }
): TracePageLink;
export function getTracePageLink(
  id: string,
  stateOrOptions?:
    | LocationState
    | { state?: LocationState; uiFind?: string; settings?: Partial<UrlLayoutSettings> },
  uiFind?: string,
  settings?: Partial<UrlLayoutSettings>
): TracePageLink {
  let state: LocationState | undefined;
  let resolvedUiFind: string | undefined = uiFind;
  let layoutSettings: Partial<UrlLayoutSettings> | undefined = settings;

  if (stateOrOptions && typeof stateOrOptions === 'object') {
    // Treat the argument as an options bag when it carries at least one known option key,
    // OR when it is an empty object {} (i.e. caller passed no positional args at all).
    // Use the `in` operator throughout — no Object.keys() allocation on every call.
    if (
      'state' in stateOrOptions ||
      'uiFind' in stateOrOptions ||
      'settings' in stateOrOptions ||
      !Object.keys(stateOrOptions).length
    ) {
      const opts = stateOrOptions as {
        state?: LocationState;
        uiFind?: string;
        settings?: Partial<UrlLayoutSettings>;
      };
      state = opts.state;
      resolvedUiFind = opts.uiFind;
      layoutSettings = opts.settings;
    } else {
      state = stateOrOptions as LocationState;
    }
  }

  const pathname = prefixUrl(`/trace/${id}`);
  const search = queryString.stringify(buildTraceQueryParams(resolvedUiFind, layoutSettings));
  return { state, pathname, ...(search ? { search } : {}) };
}

/**
 * Parses URL query parameters into layout settings.
 * Always returns both fields in the result object.
 * A field is null when no valid override could be derived from the URL,
 * including when the corresponding query parameter is absent or unrecognized.
 */
export function parseLayoutSettingsFromUrl(search: string): UrlLayoutSettings {
  const params = queryString.parse(search);

  let timelineBarsVisible: boolean | null = null;
  const timelineParamRaw = params[URL_PARAM_TIMELINE];
  const timelineParam = Array.isArray(timelineParamRaw) ? timelineParamRaw[0] : timelineParamRaw;
  if (timelineParam === 'off') timelineBarsVisible = false;
  else if (timelineParam === 'on') timelineBarsVisible = true;

  let detailPanelMode: SpanDetailPanelMode | null = null;
  const sidebarParamRaw = params[URL_PARAM_SIDEBAR];
  const sidebarParam = Array.isArray(sidebarParamRaw) ? sidebarParamRaw[0] : sidebarParamRaw;
  if (sidebarParam && sidebarParam in SIDEBAR_URL_VALUE_TO_MODE) {
    detailPanelMode = SIDEBAR_URL_VALUE_TO_MODE[sidebarParam];
  }

  return { timelineBarsVisible, detailPanelMode };
}
