// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import memoizeOne from 'memoize-one';
import queryString from 'query-string';
import { matchPath } from 'react-router-dom';

import prefixUrl from '../../utils/prefix-url';
import { MAX_LENGTH } from '../DeepDependencies/Graph/DdgNodeContent/constants';

import { SearchQuery } from '../../types/search';
import parseQuery from '../../utils/parseQuery';

export { isSameQuery, isQueryEmpty } from '../../utils/search-query';

export const ROUTE_PATH = prefixUrl('/search');

export function matches(path: string) {
  return Boolean(matchPath(ROUTE_PATH, path));
}

type TUrlState = Record<string, string | string[] | undefined | Record<string, string>> & {
  traceID?: string | string[];
  spanLinks?: Record<string, string>;
};

export type { TUrlState };

export function getUrl(query?: TUrlState) {
  const searchUrl = prefixUrl(`/search`);
  if (!query) return searchUrl;

  const { traceID, spanLinks, ...rest } = query;
  let ids = traceID;
  if (spanLinks && traceID) {
    ids = (Array.isArray(traceID) ? traceID : [traceID]).filter((id: string) => !spanLinks[id]);
  }
  const stringifyArg = {
    ...rest,
    span:
      spanLinks &&
      Object.keys(spanLinks).reduce((res: string[], trace: string) => {
        return [...res, `${spanLinks[trace]}@${trace}`];
      }, []),
    traceID: ids && ids.length ? ids : undefined,
  };

  const fullUrl = `${searchUrl}?${queryString.stringify(stringifyArg)}`;
  if (fullUrl.length <= MAX_LENGTH) return fullUrl;

  const truncated = fullUrl.slice(0, MAX_LENGTH + 1);
  if (truncated[MAX_LENGTH] === '&') return truncated.slice(0, -1);

  return truncated.slice(0, truncated.lastIndexOf('&'));
}

export const getUrlState: (search: string) => TUrlState = memoizeOne(function getUrlState(
  search: string
): TUrlState {
  const { traceID, span, ...rest } = parseQuery(search);
  const rv: TUrlState = { ...rest };
  const traceIDs = new Set(!traceID || Array.isArray(traceID) ? traceID : [traceID]);
  const spanLinks: Record<string, string> = {};
  if (span && span.length) {
    (Array.isArray(span) ? span : [span]).forEach(s => {
      const [spansStr, trace] = s.split('@');
      traceIDs.add(trace);
      if (spansStr) {
        if (spanLinks[trace]) spanLinks[trace] = spanLinks[trace].concat(' ', spansStr);
        else spanLinks[trace] = spansStr;
      }
    });
    rv.spanLinks = spanLinks;
  }
  if (traceIDs.size) rv.traceID = [...traceIDs];
  return rv;
});

// Returns the first element when the URL param was repeated (e.g. ?service=a&service=b),
// otherwise returns the value as-is (string or undefined).
function firstOf(v: string | string[] | undefined | Record<string, string>): string | undefined {
  if (Array.isArray(v)) return v[0];
  if (typeof v === 'string') return v;
  return undefined;
}

/** Inverse of searchQueryFromUrl: convert a SearchQuery back into a TUrlState for getUrl(). */
export function searchQueryToUrlState(q: SearchQuery): TUrlState {
  const state: TUrlState = {
    service: q.service,
    operation: q.operation,
    start: String(q.start),
    end: String(q.end),
    limit: String(q.limit),
    lookback: q.lookback,
  };
  if (q.minDuration !== undefined) state.minDuration = q.minDuration;
  if (q.maxDuration !== undefined) state.maxDuration = q.maxDuration;
  if (q.tags !== undefined) state.tags = q.tags;
  return state;
}

/**
 * Parse the URL search string into a typed SearchQuery, or null when no search
 * params are present (homepage / no query submitted yet).
 *
 * SearchForm always writes concrete start/end epoch values to the URL (converted
 * from the lookback selector) so that shared links reproduce the same time window.
 * lookback is kept in the URL so SearchForm can restore the selector label on the
 * next visit.
 */
export function searchQueryFromUrl(search: string): SearchQuery | null {
  const q = getUrlState(search);
  if (!q.service && !q.start && !q.end) return null;
  return {
    service: firstOf(q?.service),
    operation: firstOf(q.operation),
    start: firstOf(q.start) ?? '',
    end: firstOf(q.end) ?? '',
    limit: (() => {
      const n = Number(firstOf(q.limit));
      return Number.isFinite(n) && n > 0 ? n : 20;
    })(),
    lookback: firstOf(q.lookback) ?? '1h',
    minDuration: typeof q.minDuration === 'string' ? q.minDuration : undefined,
    maxDuration: typeof q.maxDuration === 'string' ? q.maxDuration : undefined,
    tags: typeof q.tags === 'string' ? q.tags : undefined,
  };
}
