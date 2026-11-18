// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { KeyValuePair, Span } from '../types/trace';
import { IOtelSpan, IAttribute } from '../types/otel';
import { TNil } from '../types';

/** The text of an attribute value as the search and the span filter match it. */
export function stringifyAttributeValue(value: unknown): string {
  if (typeof value === 'object' && value !== null && !(value instanceof Uint8Array)) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/** A parsed `key==value` term: the whole key and the whole value of the attribute it names, trimmed and lower-cased. */
export type ExactAttributeTerm = { key: string; value: string };

/**
 * Reads a term of the form `key==value` as an exact attribute term, or returns null for any other
 * term. The value is everything after the first `==`, so it may hold `==` itself. A term without
 * a key or without a value, such as `==200` or text that ends in `==`, is not an exact attribute
 * term, so that base64 padding and a half-typed term stay text.
 */
export function parseExactAttributeTerm(term: string): ExactAttributeTerm | null {
  const operatorIndex = term.indexOf('==');
  if (operatorIndex < 0) return null;
  const key = term.slice(0, operatorIndex).trim().toLowerCase();
  const value = term
    .slice(operatorIndex + 2)
    .trim()
    .toLowerCase();
  return key && value ? { key, value } : null;
}

/**
 * The comparison is case-insensitive and ignores surrounding whitespace. An attribute without a
 * value matches no term, as the substring search skips it.
 */
export function matchesExactAttributeTerm(
  attribute: { key: string; value?: unknown },
  term: ExactAttributeTerm
): boolean {
  if (attribute.value === null || attribute.value === undefined) return false;
  return (
    attribute.key.trim().toLowerCase() === term.key &&
    stringifyAttributeValue(attribute.value).trim().toLowerCase() === term.value
  );
}

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

  // a span with an attribute that matches one of these is a match; an exact attribute term is
  // not searched as text, because a substring match would find the longer values that it excludes
  const exactAttributeTerms: ExactAttributeTerm[] = [];

  results.filter(Boolean).forEach(w => {
    if (w[0] === '-') {
      excludeKeys.push(w.substr(1).toLowerCase());
    } else {
      const exactAttributeTerm = parseExactAttributeTerm(w);
      if (exactAttributeTerm) {
        exactAttributeTerms.push(exactAttributeTerm);
      } else {
        includeFilters.push(w.toLowerCase());
      }
    }
  });

  const isTextInFilters = (filters: Array<string>, text: string) =>
    filters.some(filter => text.toLowerCase().includes(filter));

  const isTextInKeyValues = (kvs: ReadonlyArray<KeyValuePair | IAttribute>) =>
    kvs
      ? kvs.some(kv => {
          // ignore checking key and value for a match if key is in excludeKeys
          if (isTextInFilters(excludeKeys, kv.key)) return false;
          const value = (kv as any).value; // handle legacy KeyValuePair and IAttribute
          if (value === null || value === undefined) return false;
          const valueString = stringifyAttributeValue(value);
          // match if key, value or key=value string matches an item in includeFilters
          return (
            isTextInFilters(includeFilters, kv.key) ||
            isTextInFilters(includeFilters, valueString) ||
            isTextInFilters(includeFilters, `${kv.key}=${valueString}`) ||
            exactAttributeTerms.some(exactAttributeTerm => matchesExactAttributeTerm(kv, exactAttributeTerm))
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
        includeFilters.some(filter => filter === span.spanID)
      );
    }
    // IOtelSpan
    return (
      isTextInFilters(includeFilters, span.name) ||
      isTextInFilters(includeFilters, span.resource.serviceName) ||
      isTextInKeyValues(span.attributes.entries()) ||
      (Array.isArray(span.events) &&
        span.events.some(event => isTextInKeyValues(event.attributes.entries()))) ||
      isTextInKeyValues(span.resource.attributes.entries()) ||
      includeFilters.some(filter => filter === span.spanID)
    );
  };

  // declare as const because need to disambiguate the type
  const rv: Set<string> = new Set(spans.filter(isSpanAMatch).map((span: Span | IOtelSpan) => span.spanID));
  return rv;
}
