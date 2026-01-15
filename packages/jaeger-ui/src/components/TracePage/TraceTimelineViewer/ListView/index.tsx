// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useEffect, useRef, useCallback, useState } from 'react';

import Positions from './Positions';
import { TNil } from '../../../../types';

type TWrapperProps = {
  style: React.CSSProperties;
  ref: (elm: HTMLDivElement) => void;
  onScroll?: () => void;
};

/**
 * @typedef
 */
type TListViewProps = {
  /**
   * Number of elements in the list.
   */
  dataLength: number;
  /**
   * Convert item index (number) to the key (string). ListView uses both indexes
   * and keys to handle the addtion of new rows.
   */
  getIndexFromKey: (key: string) => number;
  /**
   * Convert item key (string) to the index (number). ListView uses both indexes
   * and keys to handle the addtion of new rows.
   */
  getKeyFromIndex: (index: number) => string;
  /**
   * Number of items to draw and add to the DOM, initially.
   */
  initialDraw?: number;
  /**
   * The parent provides fallback height measurements when there is not a
   * rendered element to measure.
   */
  itemHeightGetter: (index: number, key: string) => number;
  /**
   * Function that renders an item; rendered items are added directly to the
   * DOM, they are not wrapped in list item wrapper HTMLElement.
   */
  // itemRenderer(itemKey, style, i, attrs)
  itemRenderer: (
    itemKey: string,
    style: Record<string, string | number>,
    index: number,
    attributes: Record<string, string>
  ) => React.ReactNode;
  /**
   * `className` for the HTMLElement that holds the items.
   */
  itemsWrapperClassName?: string;
  /**
   * When adding new items to the DOM, this is the number of items to add above
   * and below the current view. E.g. if list is 100 items and is srcolled
   * halfway down (so items [46, 55] are in view), then when a new range of
   * items is rendered, it will render items `46 - viewBuffer` to
   * `55 + viewBuffer`.
   */
  viewBuffer: number;
  /**
   * The minimum number of items offscreen in either direction; e.g. at least
   * `viewBuffer` number of items must be off screen above and below the
   * current view, or more items will be rendered.
   */
  viewBufferMin: number;
  /**
   * When `true`, expect `_wrapperElm` to have `overflow: visible` and to,
   * essentially, be tall to the point the entire page will will end up
   * scrolling as a result of the ListView. Similar to react-virtualized
   * window scroller.
   *
   * - Ref: https://bvaughn.github.io/react-virtualized/#/components/WindowScroller
   * - Ref:https://github.com/bvaughn/react-virtualized/blob/497e2a1942529560681d65a9ef9f5e9c9c9a49ba/docs/WindowScroller.md
   */
  windowScroller?: boolean;
};

const DEFAULT_INITIAL_DRAW = 300;

/**
 * Virtualized list view component, for the most part, only renders the window
 * of items that are in-view with some buffer before and after. Listens for
 * scroll events and updates which items are rendered. See react-virtualized
 * for a suite of components with similar, but generalized, functinality.
 * https://github.com/bvaughn/react-virtualized
 *
 * Note: Presently, ListView cannot be a PureComponent. This is because ListView
 * is sensitive to the underlying state that drives the list items, but it
 * doesn't actually receive that state. So, a render may still be required even
 * if ListView's props are unchanged.
 *
 * @export
 * @function ListView
 */
const ListView: React.FC<TListViewProps> = props => {
  const {
    dataLength,
    getKeyFromIndex,
    getIndexFromKey,
    initialDraw = DEFAULT_INITIAL_DRAW,
    itemRenderer,
    itemHeightGetter,
    itemsWrapperClassName = '',
    viewBuffer,
    viewBufferMin,
    windowScroller = false,
  } = props;

  // Refs to store mutable values that don't trigger re-renders
  const yPositionsRef = useRef<Positions>(new Positions(200));
  const knownHeightsRef = useRef<Map<string, number>>(new Map());
  const startIndexDrawnRef = useRef<number>(2 ** 20);
  const endIndexDrawnRef = useRef<number>(-(2 ** 20));
  const startIndexRef = useRef<number>(0);
  const endIndexRef = useRef<number>(0);
  const viewHeightRef = useRef<number>(-1);
  const scrollTopRef = useRef<number>(-1);
  const isScrolledOrResizedRef = useRef<boolean>(false);
  const htmlTopOffsetRef = useRef<number>(-1);
  const windowScrollListenerAddedRef = useRef<boolean>(false);
  const htmlElmRef = useRef<HTMLElement>(document.documentElement as any);
  const wrapperElmRef = useRef<HTMLElement | TNil>(undefined);
  const itemHolderElmRef = useRef<HTMLElement | TNil>(undefined);

  // State to force re-renders when needed
  const [, forceUpdate] = useState({});
  const triggerRerender = useCallback(() => forceUpdate({}), []);

  /**
   * Get the height of the element at index `i`; first check the known heigths,
   * fallbck to `.props.itemHeightGetter(...)`.
   */
  const getHeight = useCallback(
    (i: number) => {
      const key = getKeyFromIndex(i);
      const known = knownHeightsRef.current.get(key);
      // known !== known iff known is NaN
      if (known != null && known === known) {
        return known;
      }
      return itemHeightGetter(i, key);
    },
    [getKeyFromIndex, itemHeightGetter]
  );

  /**
   * Returns true is the view height (scroll window) or scroll position have
   * changed.
   */
  const isViewChanged = useCallback(() => {
    if (!wrapperElmRef.current) {
      return false;
    }
    const useRoot = windowScroller;
    const clientHeight = useRoot ? htmlElmRef.current.clientHeight : wrapperElmRef.current.clientHeight;
    const scrollTop = useRoot ? htmlElmRef.current.scrollTop : wrapperElmRef.current.scrollTop;
    return clientHeight !== viewHeightRef.current || scrollTop !== scrollTopRef.current;
  }, [windowScroller]);

  /**
   * Recalculate _startIndex and _endIndex, e.g. which items are in view.
   */
  const calcViewIndexes = useCallback(() => {
    const useRoot = windowScroller;
    // funky if statement is to satisfy flow
    if (!useRoot) {
      /* istanbul ignore next */
      if (!wrapperElmRef.current) {
        viewHeightRef.current = -1;
        startIndexRef.current = 0;
        endIndexRef.current = 0;
        return;
      }
      viewHeightRef.current = wrapperElmRef.current.clientHeight;
      scrollTopRef.current = wrapperElmRef.current.scrollTop;
    } else {
      viewHeightRef.current = window.innerHeight - htmlTopOffsetRef.current;
      scrollTopRef.current = window.scrollY;
    }
    const yStart = scrollTopRef.current;
    const yEnd = scrollTopRef.current + viewHeightRef.current;
    startIndexRef.current = yPositionsRef.current.findFloorIndex(yStart, getHeight);
    endIndexRef.current = yPositionsRef.current.findFloorIndex(yEnd, getHeight);
  }, [windowScroller, getHeight]);

  /**
   * Checked to see if the currently rendered items are sufficient, if not,
   * force an update to trigger more items to be rendered.
   */
  const positionList = useCallback(() => {
    isScrolledOrResizedRef.current = false;
    if (!wrapperElmRef.current) {
      return;
    }
    calcViewIndexes();
    // indexes drawn should be padded by at least props.viewBufferMin
    const maxStart = viewBufferMin > startIndexRef.current ? 0 : startIndexRef.current - viewBufferMin;
    const minEnd =
      viewBufferMin < dataLength - endIndexRef.current ? endIndexRef.current + viewBufferMin : dataLength - 1;
    if (maxStart < startIndexDrawnRef.current || minEnd > endIndexDrawnRef.current) {
      triggerRerender();
    }
  }, [calcViewIndexes, viewBufferMin, dataLength, triggerRerender]);

  /**
   * Scroll event listener that schedules a remeasuring of which items should be
   * rendered.
   */
  const onScroll = useCallback(() => {
    if (!isScrolledOrResizedRef.current) {
      isScrolledOrResizedRef.current = true;
      window.requestAnimationFrame(positionList);
    }
  }, [positionList]);

  /**
   * Go through all items that are rendered and save their height based on their
   * item-key (which is on a data-* attribute). If any new or adjusted heights
   * are found, re-measure the current known y-positions (via .yPositions).
   */
  const scanItemHeights = useCallback(() => {
    if (!itemHolderElmRef.current) {
      return;
    }
    // note the keys for the first and last altered heights, the `yPositions`
    // needs to be updated
    let lowDirtyKey = null;
    let highDirtyKey = null;
    let isDirty = false;
    // iterating childNodes is faster than children
    // https://jsperf.com/large-htmlcollection-vs-large-nodelist
    const nodes = itemHolderElmRef.current.childNodes;
    const max = nodes.length;
    for (let i = 0; i < max; i++) {
      const node: HTMLElement = nodes[i] as any;
      // use `.getAttribute(...)` instead of `.dataset` for jest / JSDOM
      const itemKey = node.getAttribute('data-item-key');
      if (!itemKey) {
        console.warn('itemKey not found');
        continue;
      }
      // measure the first child, if it's available, otherwise the node itself
      // (likely not transferable to other contexts, and instead is specific to
      // how we have the items rendered)
      const measureSrc: Element = node.firstElementChild || node;
      const observed = measureSrc.clientHeight;
      const known = knownHeightsRef.current.get(itemKey);
      if (observed !== known) {
        knownHeightsRef.current.set(itemKey, observed);
        if (!isDirty) {
          isDirty = true;
          lowDirtyKey = highDirtyKey = itemKey;
        } else {
          highDirtyKey = itemKey;
        }
      }
    }
    if (lowDirtyKey != null && highDirtyKey != null) {
      // update yPositions, then redraw
      const imin = getIndexFromKey(lowDirtyKey);
      const imax = highDirtyKey === lowDirtyKey ? imin : getIndexFromKey(highDirtyKey);
      yPositionsRef.current.calcHeights(imax, getHeight, imin);
      triggerRerender();
    }
  }, [getIndexFromKey, getHeight, triggerRerender]);

  const initWrapper = useCallback(
    (elm: HTMLElement | TNil) => {
      wrapperElmRef.current = elm;
      if (!windowScroller && elm) {
        viewHeightRef.current = elm.clientHeight;
      }
    },
    [windowScroller]
  );

  const initItemHolder = useCallback(
    (elm: HTMLElement | TNil) => {
      itemHolderElmRef.current = elm;
      scanItemHeights();
    },
    [scanItemHeights]
  );

  // Public API methods (exposed via ref if needed)
  const getViewHeight = useCallback(() => viewHeightRef.current, []);

  const getBottomVisibleIndex = useCallback((): number => {
    const bottomY = scrollTopRef.current + viewHeightRef.current;
    return yPositionsRef.current.findFloorIndex(bottomY, getHeight);
  }, [getHeight]);

  const getTopVisibleIndex = useCallback(
    (): number => yPositionsRef.current.findFloorIndex(scrollTopRef.current, getHeight),
    [getHeight]
  );

  const getRowPosition = useCallback(
    (index: number): { height: number; y: number } => yPositionsRef.current.getRowPosition(index, getHeight),
    [getHeight]
  );

  // ComponentDidMount effect
  useEffect(() => {
    if (windowScroller) {
      if (wrapperElmRef.current) {
        const { top } = wrapperElmRef.current.getBoundingClientRect();
        htmlTopOffsetRef.current = top + htmlElmRef.current.scrollTop;
      }
      window.addEventListener('scroll', onScroll);
      windowScrollListenerAddedRef.current = true;
    }

    // ComponentWillUnmount cleanup
    return () => {
      if (windowScrollListenerAddedRef.current) {
        window.removeEventListener('scroll', onScroll);
      }
    };
  }, [windowScroller, onScroll]);

  // ComponentDidUpdate effect - scan item heights after render
  useEffect(() => {
    if (itemHolderElmRef.current) {
      scanItemHeights();
    }
  });

  // Render logic
  const heightGetter = getHeight;
  const items = [];
  let start;
  let end;

  yPositionsRef.current.profileData(dataLength);

  if (!wrapperElmRef.current) {
    start = 0;
    end = (initialDraw < dataLength ? initialDraw : dataLength) - 1;
  } else {
    if (isViewChanged()) {
      calcViewIndexes();
    }
    const maxStart = viewBufferMin > startIndexRef.current ? 0 : startIndexRef.current - viewBufferMin;
    const minEnd =
      viewBufferMin < dataLength - endIndexRef.current ? endIndexRef.current + viewBufferMin : dataLength - 1;
    if (maxStart < startIndexDrawnRef.current || minEnd > endIndexDrawnRef.current) {
      start = viewBuffer > startIndexRef.current ? 0 : startIndexRef.current - viewBuffer;
      end = endIndexRef.current + viewBuffer;
      if (end >= dataLength) {
        end = dataLength - 1;
      }
    } else {
      start = startIndexDrawnRef.current;
      end = endIndexDrawnRef.current > dataLength - 1 ? dataLength - 1 : endIndexDrawnRef.current;
    }
  }

  yPositionsRef.current.calcHeights(end, heightGetter, start || -1);
  startIndexDrawnRef.current = start;
  endIndexDrawnRef.current = end;

  items.length = end - start + 1;
  for (let i = start; i <= end; i++) {
    const { y: top, height } = yPositionsRef.current.getRowPosition(i, heightGetter);
    const style = {
      height,
      top,
      position: 'absolute',
    };
    const itemKey = getKeyFromIndex(i);
    const attrs = { 'data-item-key': itemKey };
    items.push(itemRenderer(itemKey, style, i, attrs));
  }

  const wrapperProps: TWrapperProps = {
    style: { position: 'relative' },
    ref: initWrapper,
  };
  if (!windowScroller) {
    wrapperProps.onScroll = onScroll;
    wrapperProps.style.height = '100%';
    wrapperProps.style.overflowY = 'auto';
  }

  const scrollerStyle = {
    position: 'relative' as const,
    height: yPositionsRef.current.getEstimatedHeight(),
  };

  return (
    <div {...wrapperProps}>
      <div style={scrollerStyle}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            margin: 0,
            padding: 0,
          }}
          className={itemsWrapperClassName}
          ref={initItemHolder}
        >
          {items}
        </div>
      </div>
    </div>
  );
};

// Attach public methods to the component for external access if needed
// Note: In functional components, this would typically be done via useImperativeHandle
// with forwardRef, but keeping the structure similar to the original for now

export default ListView;
