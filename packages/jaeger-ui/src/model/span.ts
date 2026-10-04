// Copyright (c) 2017 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { Span, SpanData, SpanReference } from '../types/trace';

function getParentSpanReference(span: SpanData): SpanReference | undefined {
  const references = span.references ?? [];
  // Legacy spans prefer the first same-trace CHILD_OF, then the first same-trace FOLLOWS_FROM.
  return (
    references.find(ref => ref.traceID === span.traceID && ref.refType === 'CHILD_OF') ??
    references.find(ref => ref.traceID === span.traceID && ref.refType === 'FOLLOWS_FROM')
  );
}

export function getParentSpanID(span: SpanData): string | undefined {
  return getParentSpanReference(span)?.spanID;
}

export function getSpanLinks(span: SpanData) {
  const references = span.references ?? [];
  const parentRef = getParentSpanReference(span);
  return references.filter(ref => ref !== parentRef);
}

/**
 * Searches the span.references to find 'CHILD_OF' reference type or returns null.
 * @param  {Span} span The span whose parent is to be returned.
 * @return {Span|null} The parent span if there is one, null otherwise.
 */

export function getParent(span: Span) {
  const parentRef = span.references ? span.references.find(ref => ref.refType === 'CHILD_OF') : null;
  return parentRef ? parentRef.span : null;
}
