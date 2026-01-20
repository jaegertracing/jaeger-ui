// Copyright (c) 2017 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { Span } from '../types/trace';

/**
 * Searches the span.references to find 'CHILD_OF' reference type or returns null.
 * @param  {Span} span The span whose parent is to be returned.
 * @return {Span|null} The parent span if there is one, null otherwise.
 */

export function getParent(span: Span) {
  const parentRef = span.references ? span.references.find(ref => ref.refType === 'CHILD_OF') : null;
  return parentRef ? parentRef.span : null;
}
