// Copyright (c) 2017 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { SpanData, SpanReference } from '../types/trace';

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

export function getNonParentReferences(span: SpanData): SpanReference[] {
  const references = span.references ?? [];
  const parentRef = getParentSpanReference(span);
  return references.filter(ref => ref !== parentRef);
}
