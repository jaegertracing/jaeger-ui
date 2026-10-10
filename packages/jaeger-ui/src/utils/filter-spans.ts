// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { KeyValuePair, Span } from '../types/trace';
import { IOtelSpan, IAttribute, StatusCode, SpanKind } from '../types/otel';
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
          const value = (kv as any).value; // handle legacy KeyValuePair and IAttribute
          if (value === null || value === undefined) return false;
          let valueString: string;
          if (typeof value === 'object' && !(value instanceof Uint8Array)) {
            try {
              valueString = JSON.stringify(value);
            } catch {
              valueString = String(value);
            }
          } else {
            valueString = String(value);
          }
          // match if key, value or key=value string matches an item in includeFilters
          return (
            isTextInFilters(includeFilters, kv.key) ||
            isTextInFilters(includeFilters, valueString) ||
            isTextInFilters(includeFilters, `${kv.key}=${valueString}`)
          );
        })
      : false;

  const matchStatus = (status?: IOtelSpan['status']) => {
    if (!status) return false;
    if (
      isTextInFilters(excludeKeys, 'status') ||
      isTextInFilters(excludeKeys, 'status_code') ||
      isTextInFilters(excludeKeys, 'status.code')
    ) {
      return false;
    }
    const statusCode = status.code;
    const isError =
      statusCode === StatusCode.ERROR ||
      statusCode === (2 as any) ||
      String(statusCode).toUpperCase() === 'ERROR';
    const isOk =
      statusCode === StatusCode.OK || statusCode === (1 as any) || String(statusCode).toUpperCase() === 'OK';
    const statusName = isError ? 'error' : isOk ? 'ok' : 'unset';
    const numericCode = isError ? '2' : isOk ? '1' : '0';

    // Direct text search (e.g. typing "error" or "ok" or "unset")
    if (isTextInFilters(includeFilters, statusName)) {
      return true;
    }

    // Prefixed search (e.g. status=error, status:error, status_code=error, status=2, etc.)
    const prefixes = ['status', 'status_code', 'status.code', 'otel.status_code', 'otel.status.code'];
    const matchesPrefix = prefixes.some(prefix =>
      includeFilters.some(filter => {
        if (filter.startsWith(`${prefix}=`) || filter.startsWith(`${prefix}:`)) {
          const query = filter.slice(prefix.length + 1).toLowerCase();
          return (
            statusName.includes(query) ||
            numericCode === query ||
            (status.message && status.message.toLowerCase().includes(query))
          );
        }
        return false;
      })
    );
    if (matchesPrefix) {
      return true;
    }

    if (status.message && isTextInFilters(includeFilters, status.message)) {
      return true;
    }
    return false;
  };

  const matchScope = (scope?: IOtelSpan['instrumentationScope']) => {
    if (!scope) return false;
    if (
      isTextInFilters(excludeKeys, 'scope') ||
      isTextInFilters(excludeKeys, 'instrumentation_scope') ||
      isTextInFilters(excludeKeys, 'instrumentation.scope')
    ) {
      return false;
    }
    if (scope.name) {
      // Direct text search (e.g. "grpc", "http", "io.opentelemetry")
      if (isTextInFilters(includeFilters, scope.name)) {
        return true;
      }
      // Prefixed search (e.g. scope=grpc, scope:grpc, instrumentation_scope=grpc)
      const prefixes = ['scope', 'instrumentation_scope', 'instrumentation.scope', 'otel.scope.name'];
      const matchesPrefix = prefixes.some(prefix =>
        includeFilters.some(filter => {
          if (filter.startsWith(`${prefix}=`) || filter.startsWith(`${prefix}:`)) {
            const query = filter.slice(prefix.length + 1).toLowerCase();
            return scope.name.toLowerCase().includes(query);
          }
          return false;
        })
      );
      if (matchesPrefix) {
        return true;
      }
    }
    if (scope.version) {
      if (isTextInFilters(includeFilters, scope.version)) {
        return true;
      }
      const versionPrefixes = ['scope.version', 'scope_version', 'scope:version'];
      const matchesVersionPrefix = versionPrefixes.some(prefix =>
        includeFilters.some(filter => {
          if (filter.startsWith(`${prefix}=`) || filter.startsWith(`${prefix}:`)) {
            const query = filter.slice(prefix.length + 1).toLowerCase();
            return (scope.version as string).toLowerCase().includes(query);
          }
          return false;
        })
      );
      if (matchesVersionPrefix) {
        return true;
      }
    }
    if (scope.attributes && isTextInKeyValues(scope.attributes.entries())) {
      return true;
    }
    return false;
  };

  const matchKind = (kind?: SpanKind) => {
    if (kind === undefined || kind === null) return false;
    if (isTextInFilters(excludeKeys, 'kind') || isTextInFilters(excludeKeys, 'span.kind')) {
      return false;
    }
    const kindStr = String(kind).toLowerCase();
    const kindNames: Record<string, string> = {
      internal: 'internal',
      server: 'server',
      client: 'client',
      producer: 'producer',
      consumer: 'consumer',
      '0': 'internal',
      '1': 'server',
      '2': 'client',
      '3': 'producer',
      '4': 'consumer',
    };
    const kindName = kindNames[kindStr] ?? kindStr;
    const prefixes = ['kind', 'span.kind', 'span_kind'];
    const matchesPrefix = prefixes.some(prefix =>
      includeFilters.some(filter => {
        if (filter.startsWith(`${prefix}=`) || filter.startsWith(`${prefix}:`)) {
          const query = filter.slice(prefix.length + 1).toLowerCase();
          return kindName.includes(query);
        }
        return false;
      })
    );
    return matchesPrefix;
  };

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
      matchStatus(span.status) ||
      matchScope(span.instrumentationScope) ||
      matchKind(span.kind) ||
      includeFilters.some(filter => filter === span.spanID)
    );
  };

  // declare as const because need to disambiguate the type
  const rv: Set<string> = new Set(spans.filter(isSpanAMatch).map((span: Span | IOtelSpan) => span.spanID));
  return rv;
}
