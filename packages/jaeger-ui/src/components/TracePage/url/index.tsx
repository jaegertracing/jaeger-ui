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

import queryString from 'query-string';

import prefixUrl from '../../../utils/prefix-url';

import { TNil } from '../../../types';

export const ROUTE_PATH = prefixUrl('/trace/:id/:spanId?');

export function getUrl(id: string, uiFind?: string, spanId?: string): string {
  const traceUrl = prefixUrl(spanId ? `/trace/${id}/${spanId}` : `/trace/${id}`);
  if (!uiFind) return traceUrl;

  return `${traceUrl}?${queryString.stringify({ uiFind })}`;
}

export function getLocation(id: string, state: Record<string, string> | TNil, uiFind?: string, spanId?: string) {
  return {
    state,
    pathname: getUrl(id, undefined, spanId),
    search: uiFind && queryString.stringify({ uiFind }),
  };
}