// Copyright (c) 2018 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import memoizeOne from 'memoize-one';
import queryString from 'query-string';
import { matchPath } from 'react-router-dom';

import prefixUrl from '../../utils/prefix-url';
import { MAX_LENGTH } from '../DeepDependencies/Graph/DdgNodeContent/constants';

import { SearchQuery } from '../../types/search';

function eqEq(a: string | number | null | undefined, b: string | number | null | undefined) {
  return (a == null && b == null) || String(a) === String(b);
}

export const ROUTE_PATH = prefixUrl('/search');

const ROUTE_MATCHER = { path: ROUTE_PATH, strict: true, exact: true };

export function matches(path: string) {
  return Boolean(matchPath(path, ROUTE_MATCHER));
}

type TUrlState = Record<string, string | string[] | undefined | Record<string, string>> & {
  traceID?: string | string[];
  spanLinks?: Record<string, string>;
};

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
  const { traceID, span, ...rest } = queryString.parse(search);
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

export function isSameQuery(a: SearchQuery, b: SearchQuery) {
  if (Boolean(a) !== Boolean(b)) {
    return false;
  }
  return (
    eqEq(a.end, b.end) &&
    eqEq(a.limit, b.limit) &&
    eqEq(a.lookback, b.lookback) &&
    eqEq(a.maxDuration, b.maxDuration) &&
    eqEq(a.minDuration, b.minDuration) &&
    eqEq(a.operation, b.operation) &&
    eqEq(a.service, b.service) &&
    eqEq(a.start, b.start) &&
    eqEq(a.tags, b.tags)
  );
}
