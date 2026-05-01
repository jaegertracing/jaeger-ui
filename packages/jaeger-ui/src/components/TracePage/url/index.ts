// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import queryString from 'query-string';

import prefixUrl from '../../../utils/prefix-url';

import { TNil } from '../../../types';

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
  // Optional ?uiFind=<text> query string for pre-filtering spans. False/undefined when absent.
  search: string | false | undefined;
  // Out-of-band router state, not visible in the URL.
  // Currently carries fromSearch so TracePageHeader can render the back-to-search button.
  state: Record<string, string> | TNil;
};

export function getTracePageLink(
  id: string,
  state: Record<string, string> | TNil,
  uiFind?: string
): TracePageLink {
  return {
    state,
    pathname: getUrl(id),
    search: uiFind && queryString.stringify({ uiFind }),
  };
}
