// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef, useReducer, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';

import Positions from './Positions';
import { TNil } from '../../../../types';

type TWrapperProps = {
  style: React.CSSProperties;
  ref: (elm: HTMLDivElement | null) => void;
  onScroll?: () => void;
};

/**
 * @typedef
 */
export type TListViewProps = {
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

export interface ListViewRef {
  getViewHeight: () => number;
  getBottomVisibleIndex: () => number;
  getTopVisibleIndex: () => number;
  getRowPosition: (index: number) => { height: number; y: number };
  forceUpdate: () => void;
}

/**
 * Virtualized list view component, for the most part, only renders the window
 * of items that are in-view with some buffer before and after. Listens for
 * scroll events and updates which items are rendered. See react-virtualized
 * for a suite of components with similar, but generalized, functinality.
 * https://github.com/bvaughn/react-virtualized
 */
const ListView = forwardRef<ListViewRef, TListViewProps>((props, ref) => {
  const yPositions = useRef(new Positions(200));
  const knownHeights = useRef(new Map<string, number>());

  const startIndexDrawn = useRef(2 ** 20);
  const endIndexDrawn = useRef(-(2 ** 20));
  const startIndex = useRef(0);
  const endIndex = useRef(0);
  const viewHeight = useRef(-1);
  const scrollTop = useRef(-1);
  const isScrolledOrResized = useRef(false);

  const htmlTopOffset = useRef(-1);
  const htmlElm = useRef<HTMLElement>(document.documentElement as any);
  const wrapperElm = useRef<HTMLElement | TNil>(undefined);
  const itemHolderElm = useRef<HTMLElement | TNil>(undefined);

  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  const getViewHeight = useCallback(() => viewHeight.current, []);

  const _getHeight = useCallback(
    (i: number) => {
      const key = props.getKeyFromIndex(i);
      const known = knownHeights.current.get(key);
      if (known != null && known === known) {
        return known;
      }
      return props.itemHeightGetter(i, key);
    },
    [props.getKeyFromIndex, props.itemHeightGetter]
  );

  const getBottomVisibleIndex = useCallback(() => {
    const bottomY = scrollTop.current + viewHeight.current;
    return yPositions.current.findFloorIndex(bottomY, _getHeight);
  }, [_getHeight]);

  const getTopVisibleIndex = useCallback(
    () => yPositions.current.findFloorIndex(scrollTop.current, _getHeight),
    [_getHeight]
  );

  const getRowPosition = useCallback(
    (index: number): { height: number; y: number } => yPositions.current.getRowPosition(index, _getHeight),
    [_getHeight]
  );

  useImperativeHandle(
    ref,
    () => ({
      getViewHeight,
      getBottomVisibleIndex,
      getTopVisibleIndex,
      getRowPosition,
      forceUpdate,
    }),
    [getBottomVisibleIndex, getRowPosition, getTopVisibleIndex, getViewHeight, forceUpdate]
  );

  const _calcViewIndexes = useCallback(() => {
    const useRoot = props.windowScroller;
    if (!useRoot) {
      if (!wrapperElm.current) {
        viewHeight.current = -1;
        startIndex.current = 0;
        endIndex.current = 0;
        return;
      }
      viewHeight.current = wrapperElm.current.clientHeight;
      scrollTop.current = wrapperElm.current.scrollTop;
    } else {
      viewHeight.current = window.innerHeight - htmlTopOffset.current;
      scrollTop.current = window.scrollY;
    }
    const yStart = scrollTop.current;
    const yEnd = scrollTop.current + viewHeight.current;
    startIndex.current = yPositions.current.findFloorIndex(yStart, _getHeight);
    endIndex.current = yPositions.current.findFloorIndex(yEnd, _getHeight);
  }, [props.windowScroller, _getHeight]);

  const _positionList = useCallback(() => {
    isScrolledOrResized.current = false;
    if (!wrapperElm.current) {
      return;
    }
    _calcViewIndexes();
    const maxStart = props.viewBufferMin > startIndex.current ? 0 : startIndex.current - props.viewBufferMin;
    const minEnd =
      props.viewBufferMin < props.dataLength - endIndex.current
        ? endIndex.current + props.viewBufferMin
        : props.dataLength - 1;
    if (maxStart < startIndexDrawn.current || minEnd > endIndexDrawn.current) {
      forceUpdate();
    }
  }, [props.dataLength, props.viewBufferMin, _calcViewIndexes]);

  const _isViewChanged = useCallback(() => {
    if (!wrapperElm.current) {
      return false;
    }
    const useRoot = props.windowScroller;
    const clientHeight = useRoot ? htmlElm.current.clientHeight : wrapperElm.current.clientHeight;
    const currentScrollTop = useRoot ? htmlElm.current.scrollTop : wrapperElm.current.scrollTop;
    return clientHeight !== viewHeight.current || currentScrollTop !== scrollTop.current;
  }, [props.windowScroller]);

  const _onScroll = useCallback(() => {
    if (!isScrolledOrResized.current) {
      isScrolledOrResized.current = true;
      window.requestAnimationFrame(_positionList);
    }
  }, [_positionList]);

  const _scanItemHeights = useCallback(() => {
    const getIndexFromKey = props.getIndexFromKey;
    if (!itemHolderElm.current) {
      return;
    }
    let lowDirtyKey = null;
    let highDirtyKey = null;
    let isDirty = false;
    const nodes = itemHolderElm.current.childNodes;
    const max = nodes.length;
    for (let i = 0; i < max; i++) {
      const node = nodes[i] as HTMLElement;
      const itemKey = node.getAttribute('data-item-key');
      if (!itemKey) {
        console.warn('itemKey not found');
        continue;
      }
      const measureSrc: Element = node.firstElementChild || node;
      const observed = measureSrc.clientHeight;
      const known = knownHeights.current.get(itemKey);
      if (observed !== known) {
        knownHeights.current.set(itemKey, observed);
        if (!isDirty) {
          isDirty = true;
          lowDirtyKey = highDirtyKey = itemKey;
        } else {
          highDirtyKey = itemKey;
        }
      }
    }
    if (lowDirtyKey != null && highDirtyKey != null) {
      const imin = getIndexFromKey(lowDirtyKey);
      const imax = highDirtyKey === lowDirtyKey ? imin : getIndexFromKey(highDirtyKey);
      yPositions.current.calcHeights(imax, _getHeight, imin);
      forceUpdate();
    }
  }, [props.getIndexFromKey, _getHeight]);

  const _initWrapper = useCallback(
    (elm: HTMLDivElement | null) => {
      wrapperElm.current = elm;
      if (!props.windowScroller && elm) {
        viewHeight.current = elm.clientHeight;
      }
    },
    [props.windowScroller]
  );

  const _initItemHolder = useCallback(
    (elm: HTMLDivElement | null) => {
      itemHolderElm.current = elm;
      _scanItemHeights();
    },
    [_scanItemHeights]
  );

  useEffect(() => {
    if (props.windowScroller) {
      if (wrapperElm.current) {
        const { top } = wrapperElm.current.getBoundingClientRect();
        htmlTopOffset.current = top + htmlElm.current.scrollTop;
      }
      window.addEventListener('scroll', _onScroll);
      return () => {
        window.removeEventListener('scroll', _onScroll);
      };
    }
    return undefined;
  }, [props.windowScroller, _onScroll]);

  // We intentionally omit the dependency array here to run after every render, 
  // mirroring the old class component's componentDidUpdate. 
  // _scanItemHeights is optimized to bail out early if item heights haven't changed.
  useEffect(() => {
    if (itemHolderElm.current) {
      _scanItemHeights();
    }
  });

  const {
    dataLength,
    getKeyFromIndex,
    initialDraw = DEFAULT_INITIAL_DRAW,
    itemsWrapperClassName = '',
    itemRenderer,
    viewBuffer,
    viewBufferMin,
    windowScroller = false,
  } = props;
  const heightGetter = _getHeight;
  const items = [];
  let start;
  let end;

  yPositions.current.profileData(dataLength);

  if (!wrapperElm.current) {
    start = 0;
    end = (initialDraw < dataLength ? initialDraw : dataLength) - 1;
  } else {
    if (_isViewChanged()) {
      _calcViewIndexes();
    }
    const maxStart = viewBufferMin > startIndex.current ? 0 : startIndex.current - viewBufferMin;
    const minEnd =
      viewBufferMin < dataLength - endIndex.current ? endIndex.current + viewBufferMin : dataLength - 1;
    if (maxStart < startIndexDrawn.current || minEnd > endIndexDrawn.current) {
      start = viewBuffer > startIndex.current ? 0 : startIndex.current - viewBuffer;
      end = endIndex.current + viewBuffer;
      if (end >= dataLength) {
        end = dataLength - 1;
      }
    } else {
      start = startIndexDrawn.current;
      end = endIndexDrawn.current > dataLength - 1 ? dataLength - 1 : endIndexDrawn.current;
    }
  }

  yPositions.current.calcHeights(end, heightGetter, start || -1);
  startIndexDrawn.current = start;
  endIndexDrawn.current = end;

  items.length = end - start + 1;
  for (let i = start; i <= end; i++) {
    const { y: top, height } = yPositions.current.getRowPosition(i, heightGetter);
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
    ref: _initWrapper,
  };
  if (!props.windowScroller) {
    wrapperProps.onScroll = _onScroll;
    wrapperProps.style.height = '100%';
    wrapperProps.style.overflowY = 'auto';
  }
  const scrollerStyle = {
    position: 'relative' as const,
    height: yPositions.current.getEstimatedHeight(),
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
          ref={_initItemHolder}
        >
          {items}
        </div>
      </div>
    </div>
  );
});

export default ListView;
