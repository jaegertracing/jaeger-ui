// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import queryString from 'query-string';

import prefixUrl from '../../../utils/prefix-url';

import type { LocationState } from '../../../types';
import type { TraceSource } from '../../../hooks/useTraceLoading';

export const ROUTE_PATH = prefixUrl('/trace/:id');

export function getTraceSource(search: string): TraceSource {
  return new URLSearchParams(search).get('source') === 'upload' ? 'upload' : 'backend';
}

export function getUrl(id: string, uiFind?: string, source: TraceSource = 'backend'): string {
  const traceUrl = prefixUrl(`/trace/${encodeURIComponent(id)}`);
  const search = queryString.stringify({ uiFind, source: source === 'upload' ? source : undefined });
  if (!search) return traceUrl;

  return `${traceUrl}?${search}`;
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
  source: TraceSource = 'backend'
): TracePageLink {
  const link: TracePageLink = { state, pathname: getUrl(id) };
  const search = queryString.stringify({ uiFind, source: source === 'upload' ? source : undefined });
  if (search) link.search = search;
  return link;
}
