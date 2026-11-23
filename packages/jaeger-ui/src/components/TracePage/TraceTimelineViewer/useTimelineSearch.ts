// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useMemo } from 'react';
import memoizeOne from 'memoize-one';

import filterSpans from '../../../utils/filter-spans';
import { withoutHiddenSpans } from '../spanFilter';
import { TNil } from '../../../types';
import { IOtelSpan } from '../../../types/otel';

/**
 * Reports a view's search matches to the page, which shows the count in the header. `hiddenCount`
 * is the number of text matches that the span filter hides; views that do not filter omit it.
 */
export type TOnSearchResults = (matches: Set<string> | TNil, hiddenCount?: number) => void;

type TTimelineSearch = { matches: Set<string> | TNil; hiddenCount: number };

const NO_SEARCH: TTimelineSearch = { matches: null, hiddenCount: 0 };

/**
 * The timeline's search: the spans whose text matches `uiFind`, without the spans that the filter
 * hides, so that the count and the highlighting never refer to a span that is not on screen. The
 * matches are reported through `onSearchResults` and returned for the rows to highlight. The result
 * is memoized so that the row renderers keep one Set identity across renders.
 */
export default function useTimelineSearch(
  uiFind: string | TNil,
  spans: ReadonlyArray<IOtelSpan>,
  hiddenIDs: ReadonlySet<string>,
  onSearchResults: TOnSearchResults
): Set<string> | TNil {
  // A filter change keeps the text matches, so only the hidden spans are taken out again.
  const filterSpansMemo = useMemo(() => memoizeOne(filterSpans), []);
  const search = useMemo(() => {
    if (!uiFind) return NO_SEARCH;
    const textMatches = filterSpansMemo(uiFind, spans);
    const matches = withoutHiddenSpans(textMatches, hiddenIDs);
    return { matches, hiddenCount: (textMatches?.size ?? 0) - (matches?.size ?? 0) };
  }, [uiFind, spans, hiddenIDs, filterSpansMemo]);

  useEffect(() => {
    onSearchResults(search.matches, search.hiddenCount);
  }, [search, onSearchResults]);

  return search.matches;
}
