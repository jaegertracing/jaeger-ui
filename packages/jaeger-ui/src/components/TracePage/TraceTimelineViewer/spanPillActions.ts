// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { createContext, useContext } from 'react';
import memoizeOne from 'memoize-one';

import type { IOtelSpan } from '../../../types/otel';
import { attributeMatchIDs, clauseDisabledReason, ISpanFilter, withoutHiddenSpans } from '../spanFilter';
import type { Verb } from '../spanFilter';
import type { ISpanPill } from './spanDecorations';

/** The verbs of the menu of a span pill: the find verb of the search input and the two filter verbs. */
export type SpanPillVerb = 'find' | Verb;

export interface ISpanPillActions {
  /** Finds, keeps or hides the spans that carry the attribute of the pill. */
  applyVerb: (verb: SpanPillVerb, pill: ISpanPill) => void;
  /**
   * For each filter verb, the reason its menu entry is disabled for the pill, or null when it is
   * enabled. The find verb is never disabled.
   */
  disabledReasons: (pill: ISpanPill) => Record<Verb, string | null>;
}

/** The trace page provides the actions, because it owns the search text and the span filter. */
export const SpanPillActionsContext = createContext<ISpanPillActions | null>(null);

export function useSpanPillActions(): ISpanPillActions {
  const actions = useContext(SpanPillActionsContext);
  if (!actions) throw new Error('A span pill needs a SpanPillActionsContext provider');
  return actions;
}

// A pass over the attributes of every span is the cost of the first opening of a menu. The
// result is kept, so that reopening the menu of the same attribute costs nothing.
const memoizedAttributeMatchIDs = memoizeOne(attributeMatchIDs);

/**
 * The search text that finds the attribute of the pill: `key=value`, quoted when it holds
 * whitespace. The search syntax cannot express a double quote, so the text is cut at the first
 * one in the value; the search matches by substring, so the shorter text still finds the attribute.
 */
export function spanPillFindText(pill: ISpanPill): string {
  const text = `${pill.attrKey}=${pill.attrMatchText}`.split('"')[0];
  return /\s/.test(text) ? `"${text}"` : text;
}

export function spanPillAttributeText(pill: ISpanPill): string {
  return `${pill.attrKey}:${pill.attrMatchText}`;
}

export function makeSpanPillActions(page: {
  trace: { spans: ReadonlyArray<IOtelSpan>; rootSpans: ReadonlyArray<IOtelSpan> };
  spanFilter: ISpanFilter;
  hiddenIDs: ReadonlySet<string>;
  applyFilter: (filter: ISpanFilter) => void;
  setUiFind: (uiFind: string) => void;
}): ISpanPillActions {
  const { trace, spanFilter, hiddenIDs, applyFilter, setUiFind } = page;
  return {
    applyVerb: (verb, pill) => {
      if (verb === 'find') {
        setUiFind(spanPillFindText(pill));
        return;
      }
      const criterion = { shape: 'attr' as const, text: spanPillAttributeText(pill) };
      applyFilter({ ...spanFilter, clauses: [...spanFilter.clauses, { verb, criterion }] });
    },
    disabledReasons: pill => {
      const matches = memoizedAttributeMatchIDs(trace.spans, spanPillAttributeText(pill));
      const visibleMatches = withoutHiddenSpans(matches, hiddenIDs) as ReadonlySet<string>;
      const reason = (verb: Verb) =>
        clauseDisabledReason(verb, visibleMatches, trace, hiddenIDs, spanFilter.treeMode);
      return { keep: reason('keep'), hide: reason('hide') };
    },
  };
}
