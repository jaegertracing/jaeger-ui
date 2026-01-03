// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import _find from 'lodash/find';
import _get from 'lodash/get';

import { TNil } from '../types';
import { Span } from '../types/trace';
import { IOtelSpan } from '../types/otel';

function getFirstAncestor(span: Span): Span | TNil {
  return _get(
    _find(
      span.references,
      ({ span: ref, refType }) =>
        ref &&
        ref.spanID &&
        ref.spanID !== span.spanID &&
        (refType === 'CHILD_OF' || refType === 'FOLLOWS_FROM')
    ),
    'span'
  );
}

export default function spanAncestorIds(span: Span | TNil): string[] {
  const ancestorIDs: string[] = [];
  if (!span) return ancestorIDs;
  let ref = getFirstAncestor(span);
  while (ref) {
    ancestorIDs.push(ref.spanID);
    ref = getFirstAncestor(ref);
  }
  return ancestorIDs;
}

/**
 * Returns an array of ancestor span IDs for an OTEL span, using parentSpan.
 * @param span - The IOtelSpan to get ancestors for
 * @returns Array of ancestor span IDs, from immediate parent to root
 */
export function otelSpanAncestorIds(span: IOtelSpan | TNil): string[] {
  const ancestorIDs: string[] = [];
  if (!span) return ancestorIDs;

  let currentParent = span.parentSpan;
  while (currentParent) {
    ancestorIDs.push(currentParent.spanId);
    currentParent = currentParent.parentSpan;
  }
  return ancestorIDs;
}
