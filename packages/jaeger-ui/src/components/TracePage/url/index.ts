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

const LAYOUT_PARAM_NAMES = [URL_PARAM_TIMELINE, URL_PARAM_SIDEBAR] as const;

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
    // Guard the lookup: a non-enum value (e.g. from JS callers or stale persisted data)
    // would produce undefined, which must not be written into the Record<string, string>.
    const sidebarValue = SIDEBAR_PARAM_VALUES[settings.detailPanelMode];
    if (typeof sidebarValue === 'string') params[URL_PARAM_SIDEBAR] = sidebarValue;
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
  // Strip a leading '?' before parsing so keys are never prefixed with it,
  // regardless of the query-string version in use.
  const params = queryString.parse(search.replace(/^\?/, ''));
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
  // Strip a leading '?' before parsing so keys are never prefixed with it,
  // regardless of the query-string version in use.
  const params = queryString.parse(search.replace(/^\?/, ''));
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

  // Only treat the second argument as an options bag when it carries at least one known
  // key. This avoids silently swallowing a mistakenly-passed settings object or a
  // String wrapper object (new String('foo')) when the caller meant to pass a uiFind string.
  if (
    uiFindOrOptions !== null &&
    typeof uiFindOrOptions === 'object' &&
    ('uiFind' in uiFindOrOptions || 'settings' in uiFindOrOptions)
  ) {
    uiFind = uiFindOrOptions.uiFind;
    layoutSettings = uiFindOrOptions.settings;
  } else {
    uiFind = uiFindOrOptions !== undefined && uiFindOrOptions !== null ? String(uiFindOrOptions) : undefined;
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

/** Options-bag shape accepted by the getTracePageLink overload. */
type TracePageLinkOptions = {
  state?: LocationState;
  uiFind?: string;
  settings?: Partial<UrlLayoutSettings>;
};

/**
 * Type guard that distinguishes a plain options bag from a LocationState object.
 * An argument qualifies as an options bag only when it carries at least one of the
 * three known option keys. An empty object {} or an object with unrecognised keys
 * is treated as a LocationState, preserving backward-compatible positional behaviour.
 */
function isTracePageLinkOptions(arg: object): arg is TracePageLinkOptions {
  return 'state' in arg || 'uiFind' in arg || 'settings' in arg;
}

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
    if (isTracePageLinkOptions(stateOrOptions)) {
      state = stateOrOptions.state;
      resolvedUiFind = stateOrOptions.uiFind;
      layoutSettings = stateOrOptions.settings;
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
  // Strip a leading '?' before parsing so keys are never prefixed with it,
  // regardless of the query-string version in use.
  const params = queryString.parse(search.replace(/^\?/, ''));

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
