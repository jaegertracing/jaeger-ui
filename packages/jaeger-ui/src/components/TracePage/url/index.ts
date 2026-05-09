// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import queryString from 'query-string';

import prefixUrl from '../../../utils/prefix-url';

import type { LocationState } from '../../../types';

export const ROUTE_PATH = prefixUrl('/trace/:id');

export function getUrl(id: string, uiFind?: string): string {
  const traceUrl = prefixUrl(`/trace/${id}`);
  if (!uiFind) return traceUrl;

  return `${traceUrl}?${queryString.stringify({ uiFind })}`;
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

export function getTracePageLink(id: string, state?: LocationState, uiFind?: string): TracePageLink {
  const link: TracePageLink = { state, pathname: getUrl(id) };
  if (uiFind) link.search = queryString.stringify({ uiFind });
  return link;
}
