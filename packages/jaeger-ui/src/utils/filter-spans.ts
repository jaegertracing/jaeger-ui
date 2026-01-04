// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { KeyValuePair, Span } from '../types/trace';
import { IOtelSpan, IAttribute } from '../types/otel';
import { TNil } from '../types';

export default function filterSpans(textFilter: string, spans: ReadonlyArray<Span | IOtelSpan> | TNil) {
  if (!spans) {
    return null;
  }

  // if a span field includes at least one filter in includeFilters, the span is a match
  const includeFilters: string[] = [];

  // values with keys that include text in any one of the excludeKeys will be ignored
  const excludeKeys: string[] = [];

  // split textFilter by whitespace, but not that in double quotes, remove empty strings, and extract includeFilters and excludeKeys
  const regex = /[^\s"]+|"([^"]*)"/g;
  const match = textFilter.match(regex);
  const results = match ? match.map(e => e.replace(/"(.*)"/, '$1')) : [];

  results.filter(Boolean).forEach(w => {
    if (w[0] === '-') {
      excludeKeys.push(w.substr(1).toLowerCase());
    } else {
      includeFilters.push(w.toLowerCase());
    }
  });

  const isTextInFilters = (filters: Array<string>, text: string) =>
    filters.some(filter => text.toLowerCase().includes(filter));

  const isTextInKeyValues = (kvs: ReadonlyArray<KeyValuePair | IAttribute>) =>
    kvs
      ? kvs.some(kv => {
          // ignore checking key and value for a match if key is in excludeKeys
          if (isTextInFilters(excludeKeys, kv.key)) return false;
          const value = (kv as KeyValuePair).value ?? (kv as IAttribute).value;
          if (value === null || value === undefined) return false;
          const valueString = value.toString();
          // match if key, value or key=value string matches an item in includeFilters
          return (
            isTextInFilters(includeFilters, kv.key) ||
            isTextInFilters(includeFilters, valueString) ||
            isTextInFilters(includeFilters, `${kv.key}=${valueString}`)
          );
        })
      : false;

  const isSpanAMatch = (span: Span | IOtelSpan) => {
    if ('operationName' in span) {
      // Legacy Span
      return (
        isTextInFilters(includeFilters, span.operationName) ||
        isTextInFilters(includeFilters, span.process.serviceName) ||
        isTextInKeyValues(span.tags) ||
        (Array.isArray(span.logs) && span.logs.some(log => isTextInKeyValues(log.fields))) ||
        isTextInKeyValues(span.process.tags) ||
        includeFilters.some(filter => filter.replace(/^0*/, '') === span.spanID.replace(/^0*/, ''))
      );
    }
    // IOtelSpan
    return (
      isTextInFilters(includeFilters, span.name) ||
      isTextInFilters(includeFilters, span.resource.serviceName) ||
      isTextInKeyValues(span.attributes) ||
      (Array.isArray(span.events) && span.events.some(event => isTextInKeyValues(event.attributes))) ||
      isTextInKeyValues(span.resource.attributes) ||
      includeFilters.some(filter => filter.replace(/^0*/, '') === span.spanID.replace(/^0*/, ''))
    );
  };

  // declare as const because need to disambiguate the type
  const rv: Set<string> = new Set(spans.filter(isSpanAMatch).map((span: Span | IOtelSpan) => span.spanID));
  return rv;
}
