// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';

import useTimelineSearch from './useTimelineSearch';
import filterSpans from '../../../utils/filter-spans';
import { IOtelSpan } from '../../../types/otel';

vi.mock('../../../utils/filter-spans');

const filterSpansMock = vi.mocked(filterSpans);

const spans = [{ spanID: 'a' }, { spanID: 'b' }, { spanID: 'c' }] as unknown as IOtelSpan[];
const NONE_HIDDEN: ReadonlySet<string> = new Set();

type THookProps = { uiFind: string | null; spans: IOtelSpan[]; hiddenIDs: ReadonlySet<string> };

function renderSearch(initialProps: THookProps) {
  const onSearchResults = vi.fn();
  const hook = renderHook(
    ({ uiFind, spans: hookSpans, hiddenIDs }: THookProps) =>
      useTimelineSearch(uiFind, hookSpans, hiddenIDs, onSearchResults),
    { initialProps }
  );
  return { ...hook, onSearchResults };
}

describe('useTimelineSearch', () => {
  beforeEach(() => {
    filterSpansMock.mockReset();
    filterSpansMock.mockReturnValue(new Set(['a', 'b']));
  });

  it('reports no matches and skips the search when there is no search text', () => {
    const { result, onSearchResults } = renderSearch({ uiFind: null, spans, hiddenIDs: NONE_HIDDEN });
    expect(result.current).toBeNull();
    expect(onSearchResults).toHaveBeenLastCalledWith(null, 0);
    expect(filterSpansMock).not.toHaveBeenCalled();
  });

  it('reports every text match when the filter hides no span', () => {
    const { result, onSearchResults } = renderSearch({ uiFind: 'x', spans, hiddenIDs: NONE_HIDDEN });
    expect(filterSpansMock).toHaveBeenCalledWith('x', spans);
    expect(result.current).toEqual(new Set(['a', 'b']));
    expect(onSearchResults).toHaveBeenLastCalledWith(result.current, 0);
  });

  it('leaves out the matches the filter hides and reports how many it left out', () => {
    const { result, onSearchResults } = renderSearch({ uiFind: 'x', spans, hiddenIDs: new Set(['b', 'c']) });
    expect(result.current).toEqual(new Set(['a']));
    expect(onSearchResults).toHaveBeenLastCalledWith(result.current, 1);
  });

  it('reports an empty set, not null, when the filter hides every match', () => {
    const { result, onSearchResults } = renderSearch({ uiFind: 'x', spans, hiddenIDs: new Set(['a', 'b']) });
    expect(result.current).toEqual(new Set());
    expect(onSearchResults).toHaveBeenLastCalledWith(result.current, 2);
  });

  it('keeps one Set identity and reports once while its inputs stay the same', () => {
    const props = { uiFind: 'x', spans, hiddenIDs: NONE_HIDDEN };
    const { result, rerender, onSearchResults } = renderSearch(props);
    const first = result.current;
    rerender({ ...props });
    expect(result.current).toBe(first);
    expect(onSearchResults).toHaveBeenCalledTimes(1);
  });

  it('does not search the spans again when only the filter changes', () => {
    const { result, rerender, onSearchResults } = renderSearch({
      uiFind: 'x',
      spans,
      hiddenIDs: NONE_HIDDEN,
    });
    rerender({ uiFind: 'x', spans, hiddenIDs: new Set(['a']) });
    expect(filterSpansMock).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual(new Set(['b']));
    expect(onSearchResults).toHaveBeenLastCalledWith(result.current, 1);
  });

  it('reports no matches once the search text is cleared', () => {
    const { result, rerender, onSearchResults } = renderSearch({
      uiFind: 'x',
      spans,
      hiddenIDs: NONE_HIDDEN,
    });
    rerender({ uiFind: null, spans, hiddenIDs: NONE_HIDDEN });
    expect(result.current).toBeNull();
    expect(onSearchResults).toHaveBeenLastCalledWith(null, 0);
  });
});
