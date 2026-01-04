// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { TNil } from '../types';
import { IOtelSpan } from '../types/otel';

/**
 * Returns an array of ancestor span IDs for an OTEL span, using parentSpan.
 * @param span - The IOtelSpan to get ancestors for
 * @returns Array of ancestor span IDs, from immediate parent to root
 */
export default function spanAncestorIds(span: IOtelSpan | TNil): string[] {
  const ancestorIDs: string[] = [];
  if (!span) return ancestorIDs;

  let currentParent = span.parentSpan;
  while (currentParent) {
    ancestorIDs.push(currentParent.spanID);
    currentParent = currentParent.parentSpan;
  }
  return ancestorIDs;
}
