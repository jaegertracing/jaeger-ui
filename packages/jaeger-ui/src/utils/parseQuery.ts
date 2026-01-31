// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import queryString, { ParseOptions } from 'query-string';

interface IParsedQuery {
  [key: string]: string | null | (string | null)[];
}

function parseQuery(query: string, options?: ParseOptions): { [key: string]: string | string[] } {
  const parsed: IParsedQuery = queryString.parse(query, options);

  const result: { [key: string]: string | string[] } = {};

  Object.keys(parsed).forEach(key => {
    if (Array.isArray(parsed[key])) {
      result[key] = (parsed[key] as string[]).map((item: string | null) => item || '');
    } else {
      result[key] = parsed[key] as string | string[];
    }
  });

  return result;
}

export default parseQuery;
