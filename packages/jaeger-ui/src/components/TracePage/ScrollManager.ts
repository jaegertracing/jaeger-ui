// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { TNil } from '../../types';
import { IOtelSpan, IOtelTrace } from '../../types/otel';
import type { RowState } from './TraceTimelineViewer/generateRowStates';

/**
 * `Accessors` is necessary because `ScrollManager` needs to be created by
 * `TracePage` so it can be passed into the keyboard shortcut manager. But,
 * `ScrollManager` needs to know about the state of `ListView` and `Positions`,
 * which are very low-level. And, storing their state info in redux or
 * `TracePage#state` would be inefficient because the state info only rarely
 * needs to be accessed (when a keyboard shortcut is triggered). `Accessors`
 * allows that state info to be accessed in a loosely coupled fashion on an
 * as-needed basis.
 */
export type Accessors = {
  getViewRange: () => [number, number];
  getSearchedSpanIDs: () => Set<string> | TNil;
  getCollapsedChildren: () => Set<string> | TNil;
  getViewHeight: () => number;
  getBottomRowIndexVisible: () => number;
  getTopRowIndexVisible: () => number;
  getRowPosition: (rowIndex: number) => { height: number; y: number };
  getRows?: () => RowState[];
  mapRowIndexToSpanIndex?: (rowIndex: number) => number;
  mapSpanIndexToRowIndex?: (spanIndex: number) => number;
};

interface IScroller {
  scrollTo: (y: number) => void;
  scrollBy: (yDelta: number, appendToLast?: boolean) => void;
}

/**
 * Returns `{ isHidden: true, ... }` if one of the parents of `span` is
 * collapsed, e.g. has children hidden.
 *
 * @param {IOtelSpan} span The Span to check for.
 * @param {Set<string>} childrenAreHidden The set of Spans known to have hidden
 *                                        children, either because it is
 *                                        collapsed or has a collapsed parent.
 * @param {number} rootDepth Stop checking ancestor collapse above this depth.
 * @returns {{ isHidden: boolean, parentIds: Set<string> }}
 */
function isSpanHidden(span: IOtelSpan, childrenAreHidden: Set<string>, rootDepth = 0) {
  const parentIDs = new Set<string>();
  let current: IOtelSpan | undefined = span.parentSpan;

  while (current && (current.depth === undefined || current.depth >= rootDepth)) {
    parentIDs.add(current.spanID);
    if (childrenAreHidden.has(current.spanID)) {
      return { isHidden: true, parentIDs };
    }
    current = current.parentSpan;
  }
  return { parentIDs, isHidden: false };
}

/**
 * ScrollManager is intended for scrolling the TracePage. Has two modes, paging
 * and scrolling to the previous or next visible span.
 */
export default class ScrollManager {
  _trace: IOtelTrace | TNil;
  _scroller: IScroller | TNil;
  _accessors: Accessors | TNil;

  constructor(trace: IOtelTrace | TNil, scroller: IScroller) {
    this._trace = trace;
    this._scroller = scroller;
    this._accessors = undefined;
  }

  _scrollPast(rowIndex: number, direction: 1 | -1) {
    const xrs = this._accessors;
    /* istanbul ignore next */
    if (!xrs) {
      throw new Error('Accessors not set');
    }
    const isUp = direction < 0;
    const position = xrs.getRowPosition(rowIndex);
    if (!position) {
      console.warn('Invalid row index');
      return;
    }
    let { y } = position;
    const vh = xrs.getViewHeight();
    if (!isUp) {
      y += position.height;
      // scrollTop is based on the top of the window
      y -= vh;
    }
    y += direction * 0.5 * vh;
    this._scroller?.scrollTo(y);
  }

  _scrollToVisibleSpan(direction: 1 | -1, startRow?: number) {
    const xrs = this._accessors;
    /* istanbul ignore next */
    if (!xrs) {
      throw new Error('Accessors not set');
    }
    if (!this._trace) {
      return;
    }

    if (xrs.getRows) {
      const rows = xrs.getRows();
      const totalRows = rows.length;
      if (totalRows === 0) {
        return;
      }
      const isUp = direction < 0;
      let boundaryRow: number;
      if (startRow != null) {
        boundaryRow = startRow;
      } else if (isUp) {
        boundaryRow = xrs.getTopRowIndexVisible();
      } else {
        boundaryRow = xrs.getBottomRowIndexVisible();
      }

      if ((boundaryRow === 0 && isUp) || (boundaryRow === totalRows - 1 && !isUp)) {
        return;
      }

      let fullViewRowIndex = boundaryRow;
      if (startRow != null) {
        fullViewRowIndex = boundaryRow - direction;
      }

      const { duration, startTime: traceStartTime } = this._trace;
      const [viewStart, viewEnd] = xrs.getViewRange();
      const checkVisibility = viewStart !== 0 || viewEnd !== 1;
      const startTime = checkVisibility ? traceStartTime + duration * viewStart : NaN;
      const endTime = checkVisibility ? traceStartTime + duration * viewEnd : NaN;
      const findMatches = xrs.getSearchedSpanIDs();
      const _collapsed = xrs.getCollapsedChildren();
      const childrenAreHidden = _collapsed ? new Set(_collapsed) : null;
      const rootDepth = rows[0]?.span?.depth ?? 0;

      const boundary = direction < 0 ? -1 : totalRows;
      let nextRowIndex: number | undefined;

      for (let i = fullViewRowIndex + direction; i !== boundary; i += direction) {
        const row = rows[i];
        if (row.isDetail) {
          continue;
        }
        const span = row.span;
        const { duration: spanDuration, spanID, startTime: spanStartTime } = span;
        const spanEndTime = spanStartTime + spanDuration;
        if (checkVisibility && (spanStartTime > endTime || spanEndTime < startTime)) {
          continue;
        }
        if (findMatches && !findMatches.has(spanID)) {
          continue;
        }
        if (childrenAreHidden) {
          const { isHidden, parentIDs } = isSpanHidden(span, childrenAreHidden, rootDepth);
          if (isHidden) {
            parentIDs.forEach(id => childrenAreHidden.add(id));
            continue;
          }
        }
        nextRowIndex = i;
        break;
      }

      if (nextRowIndex === undefined || nextRowIndex === boundary) {
        nextRowIndex = boundary - direction;

        if (childrenAreHidden || rows.some(r => r.isDetail)) {
          let isFallbackHidden: boolean;
          do {
            const row = rows[nextRowIndex];
            if (!row || row.isDetail) {
              isFallbackHidden = true;
              nextRowIndex += direction < 0 ? 1 : -1;
              continue;
            }
            if (childrenAreHidden) {
              const { isHidden, parentIDs } = isSpanHidden(row.span, childrenAreHidden, rootDepth);
              if (isHidden) {
                parentIDs.forEach(id => childrenAreHidden.add(id));
                nextRowIndex += direction < 0 ? 1 : -1;
              }
              isFallbackHidden = isHidden;
            } else {
              isFallbackHidden = false;
            }
          } while (isFallbackHidden && nextRowIndex >= 0 && nextRowIndex < totalRows);
        }
      }

      if (
        nextRowIndex != null &&
        nextRowIndex >= 0 &&
        nextRowIndex < totalRows &&
        !rows[nextRowIndex]?.isDetail
      ) {
        this._scrollPast(nextRowIndex, direction);
      }
      return;
    }

    const { duration, spans, startTime: traceStartTime } = this._trace;
    const isUp = direction < 0;
    let boundaryRow: number;
    if (startRow != null) {
      boundaryRow = startRow;
    } else if (isUp) {
      boundaryRow = xrs.getTopRowIndexVisible();
    } else {
      boundaryRow = xrs.getBottomRowIndexVisible();
    }
    const spanIndex = xrs.mapRowIndexToSpanIndex ? xrs.mapRowIndexToSpanIndex(boundaryRow) : boundaryRow;
    if ((spanIndex === 0 && isUp) || (spanIndex === spans.length - 1 && !isUp)) {
      return;
    }
    // fullViewSpanIndex is one row inside the view window unless already at the top or bottom
    let fullViewSpanIndex = spanIndex;
    if (startRow != null) {
      fullViewSpanIndex = spanIndex - direction;
    } else if (spanIndex !== 0 && spanIndex !== spans.length - 1) {
      fullViewSpanIndex -= direction;
    }
    const [viewStart, viewEnd] = xrs.getViewRange();
    const checkVisibility = viewStart !== 0 || viewEnd !== 1;
    // use NaN as fallback to make flow happy
    const startTime = checkVisibility ? traceStartTime + duration * viewStart : NaN;
    const endTime = checkVisibility ? traceStartTime + duration * viewEnd : NaN;
    const findMatches = xrs.getSearchedSpanIDs();
    const _collapsed = xrs.getCollapsedChildren();
    const childrenAreHidden = _collapsed ? new Set(_collapsed) : null;

    const boundary = direction < 0 ? -1 : spans.length;
    let nextSpanIndex: number | undefined;
    for (let i = fullViewSpanIndex + direction; i !== boundary; i += direction) {
      const span = spans[i];
      const { duration: spanDuration, spanID, startTime: spanStartTime } = span;
      const spanEndTime = spanStartTime + spanDuration;
      if (checkVisibility && (spanStartTime > endTime || spanEndTime < startTime)) {
        // span is not visible within the view range
        continue;
      }
      if (findMatches && !findMatches.has(spanID)) {
        // skip to search matches (when searching)
        continue;
      }
      if (childrenAreHidden) {
        // make sure the span is not collapsed
        const { isHidden, parentIDs } = isSpanHidden(span, childrenAreHidden);
        if (isHidden) {
          parentIDs.forEach(id => childrenAreHidden.add(id));
          continue;
        }
      }
      nextSpanIndex = i;
      break;
    }
    if (nextSpanIndex === undefined || nextSpanIndex === boundary) {
      // might as well scroll to the top or bottom
      nextSpanIndex = boundary - direction;

      // If there are hidden children, scroll to the last visible span
      if (childrenAreHidden) {
        let isFallbackHidden: boolean;
        do {
          const { isHidden, parentIDs } = isSpanHidden(spans[nextSpanIndex], childrenAreHidden);
          if (isHidden) {
            parentIDs.forEach(id => childrenAreHidden.add(id));
            nextSpanIndex += direction < 0 ? 1 : -1;
          }
          isFallbackHidden = isHidden;
        } while (isFallbackHidden && nextSpanIndex >= 0 && nextSpanIndex < spans.length);
      }
    }
    const nextRow = xrs.mapSpanIndexToRowIndex ? xrs.mapSpanIndexToRowIndex(nextSpanIndex) : nextSpanIndex;
    if (nextRow !== -1) {
      this._scrollPast(nextRow, direction);
    }
  }

  /**
   * Sometimes the ScrollManager is created before the trace is loaded. This
   * setter allows the trace to be set asynchronously.
   */
  setTrace(trace: IOtelTrace | TNil) {
    this._trace = trace;
  }

  /**
   * `setAccessors` is bound in the ctor, so it can be passed as a prop to
   * children components.
   */
  setAccessors = (accessors: Accessors) => {
    this._accessors = accessors;
  };

  /**
   * Scrolls around one page down (0.95x). It is bounds in the ctor, so it can
   * be used as a keyboard shortcut handler.
   */
  scrollPageDown = () => {
    if (!this._scroller || !this._accessors) {
      return;
    }
    this._scroller.scrollBy(0.95 * this._accessors.getViewHeight(), true);
  };

  /**
   * Scrolls around one page up (0.95x). It is bounds in the ctor, so it can
   * be used as a keyboard shortcut handler.
   */
  scrollPageUp = () => {
    if (!this._scroller || !this._accessors) {
      return;
    }
    this._scroller.scrollBy(-0.95 * this._accessors.getViewHeight(), true);
  };

  /**
   * Scrolls to the next visible span, ignoring spans that do not match the
   * text filter, if there is one. It is bounds in the ctor, so it can
   * be used as a keyboard shortcut handler.
   */
  scrollToNextVisibleSpan = () => {
    this._scrollToVisibleSpan(1);
  };

  /**
   * Scrolls to the previous visible span, ignoring spans that do not match the
   * text filter, if there is one. It is bounds in the ctor, so it can
   * be used as a keyboard shortcut handler.
   */
  scrollToPrevVisibleSpan = () => {
    this._scrollToVisibleSpan(-1);
  };

  scrollToFirstVisibleSpan = () => {
    this._scrollToVisibleSpan(1, 0);
  };

  destroy() {
    this._trace = undefined;
    this._scroller = undefined;
    this._accessors = undefined;
  }
}
