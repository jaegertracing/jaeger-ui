// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { useEffect, useRef, useCallback, useState, useImperativeHandle } from 'react';

import Positions from './Positions';
import { TNil } from '../../../../types';

/* ---------------------------------- TYPES --------------------------------- */

type TWrapperProps = {
  style: React.CSSProperties;
  ref: (elm: HTMLDivElement | null) => void;
  onScroll?: () => void;
};

export type ListViewHandle = {
  forceUpdate: () => void;
  getViewHeight: () => number;
  getBottomVisibleIndex: () => number;
  getTopVisibleIndex: () => number;
  getRowPosition: (index: number) => { height: number; y: number };
};

type TListViewProps = {
  dataLength: number;
  getIndexFromKey: (key: string) => number;
  getKeyFromIndex: (index: number) => string;
  initialDraw?: number;
  itemHeightGetter: (index: number, key: string) => number;
  itemRenderer: (
    itemKey: string,
    style: Record<string, string | number>,
    index: number,
    attributes: Record<string, string>
  ) => React.ReactNode;
  itemsWrapperClassName?: string;
  viewBuffer: number;
  viewBufferMin: number;
  windowScroller?: boolean;
};

const DEFAULT_INITIAL_DRAW = 300;

/* ------------------------------- COMPONENT --------------------------------- */

const ListView = React.forwardRef<ListViewHandle, TListViewProps>((props, ref) => {
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

  const yPositionsRef = useRef(new Positions(200));
  const knownHeightsRef = useRef<Map<string, number>>(new Map());

  const startIndexDrawnRef = useRef<number>(2 ** 20);
  const endIndexDrawnRef = useRef<number>(-(2 ** 20));
  const startIndexRef = useRef<number>(0);
  const endIndexRef = useRef<number>(0);

  const viewHeightRef = useRef<number>(-1);
  const scrollTopRef = useRef<number>(-1);
  const isScrolledOrResizedRef = useRef<boolean>(false);

  const htmlTopOffsetRef = useRef<number>(-1);
  const htmlElmRef = useRef<HTMLElement>(document.documentElement);
  const wrapperElmRef = useRef<HTMLElement | TNil>(undefined);
  const itemHolderElmRef = useRef<HTMLElement | TNil>(undefined);

  const [, forceUpdate] = useState({});
  const triggerRerender = useCallback(() => forceUpdate({}), []);

  /* ------------------------------ CORE LOGIC ------------------------------ */

  const getHeight = useCallback(
    (i: number) => {
      const key = getKeyFromIndex(i);
      const known = knownHeightsRef.current.get(key);
      if (known != null && known === known) return known;
      return itemHeightGetter(i, key);
    },
    [getKeyFromIndex, itemHeightGetter]
  );

  const isViewChanged = useCallback(() => {
    if (!wrapperElmRef.current) return false;
    const useRoot = windowScroller;
    const clientHeight = useRoot ? htmlElmRef.current.clientHeight : wrapperElmRef.current.clientHeight;
    const scrollTop = useRoot ? htmlElmRef.current.scrollTop : wrapperElmRef.current.scrollTop;
    return clientHeight !== viewHeightRef.current || scrollTop !== scrollTopRef.current;
  }, [windowScroller]);

  const calcViewIndexes = useCallback(() => {
    const useRoot = windowScroller;

    if (!useRoot) {
      if (!wrapperElmRef.current) return;
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

  const positionList = useCallback(() => {
    isScrolledOrResizedRef.current = false;
    if (!wrapperElmRef.current) return;

    calcViewIndexes();

    const maxStart = viewBufferMin > startIndexRef.current ? 0 : startIndexRef.current - viewBufferMin;
    const minEnd =
      viewBufferMin < dataLength - endIndexRef.current ? endIndexRef.current + viewBufferMin : dataLength - 1;

    if (maxStart < startIndexDrawnRef.current || minEnd > endIndexDrawnRef.current) {
      triggerRerender();
    }
  }, [calcViewIndexes, viewBufferMin, dataLength, triggerRerender]);

  const onScroll = useCallback(() => {
    if (!isScrolledOrResizedRef.current) {
      isScrolledOrResizedRef.current = true;
      window.requestAnimationFrame(positionList);
    }
  }, [positionList]);

  const scanItemHeights = useCallback(() => {
    if (!itemHolderElmRef.current) return;

    let lowDirtyKey: string | null = null;
    let highDirtyKey: string | null = null;
    let isDirty = false;

    const nodes = itemHolderElmRef.current.childNodes;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i] as HTMLElement;
      const itemKey = node.getAttribute('data-item-key');
      if (!itemKey) continue;

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

    if (lowDirtyKey && highDirtyKey) {
      const imin = getIndexFromKey(lowDirtyKey);
      const imax = lowDirtyKey === highDirtyKey ? imin : getIndexFromKey(highDirtyKey);
      yPositionsRef.current.calcHeights(imax, getHeight, imin);
      triggerRerender();
    }
  }, [getIndexFromKey, getHeight, triggerRerender]);

  /* -------------------------- IMPERATIVE API -------------------------- */

  const getViewHeight = useCallback(() => viewHeightRef.current, []);
  const getBottomVisibleIndex = useCallback(
    () => yPositionsRef.current.findFloorIndex(scrollTopRef.current + viewHeightRef.current, getHeight),
    [getHeight]
  );
  const getTopVisibleIndex = useCallback(
    () => yPositionsRef.current.findFloorIndex(scrollTopRef.current, getHeight),
    [getHeight]
  );
  const getRowPosition = useCallback(
    (index: number) => yPositionsRef.current.getRowPosition(index, getHeight),
    [getHeight]
  );

  useImperativeHandle(ref, () => ({
    forceUpdate: triggerRerender,
    getViewHeight,
    getBottomVisibleIndex,
    getTopVisibleIndex,
    getRowPosition,
  }));

  /* ----------------------------- EFFECTS ----------------------------- */

  useEffect(() => {
    if (windowScroller && wrapperElmRef.current) {
      const { top } = wrapperElmRef.current.getBoundingClientRect();
      htmlTopOffsetRef.current = top + htmlElmRef.current.scrollTop;
      window.addEventListener('scroll', onScroll);
      return () => window.removeEventListener('scroll', onScroll);
    }
  }, [windowScroller, onScroll]);

  useEffect(() => {
    scanItemHeights();
  });

  /* ------------------------------ RENDER ------------------------------ */

  const items: React.ReactNode[] = [];
  let start = 0;
  let end = 0;

  yPositionsRef.current.profileData(dataLength);

  if (!wrapperElmRef.current) {
    end = (initialDraw < dataLength ? initialDraw : dataLength) - 1;
  } else {
    if (isViewChanged()) calcViewIndexes();

    const maxStart = viewBufferMin > startIndexRef.current ? 0 : startIndexRef.current - viewBufferMin;
    const minEnd =
      viewBufferMin < dataLength - endIndexRef.current ? endIndexRef.current + viewBufferMin : dataLength - 1;

    if (maxStart < startIndexDrawnRef.current || minEnd > endIndexDrawnRef.current) {
      start = viewBuffer > startIndexRef.current ? 0 : startIndexRef.current - viewBuffer;
      end = Math.min(endIndexRef.current + viewBuffer, dataLength - 1);
    } else {
      start = startIndexDrawnRef.current;
      end = Math.min(endIndexDrawnRef.current, dataLength - 1);
    }
  }

  yPositionsRef.current.calcHeights(end, getHeight, start || -1);
  startIndexDrawnRef.current = start;
  endIndexDrawnRef.current = end;

  for (let i = start; i <= end; i++) {
    const { y: top, height } = yPositionsRef.current.getRowPosition(i, getHeight);
    const style = { height, top, position: 'absolute' as const };
    const key = getKeyFromIndex(i);
    items.push(itemRenderer(key, style, i, { 'data-item-key': key }));
  }

  return (
    <div
      ref={el => {
        wrapperElmRef.current = el || undefined;
      }}
      onScroll={!windowScroller ? onScroll : undefined}
      style={{ position: 'relative', height: '100%', overflowY: windowScroller ? undefined : 'auto' }}
    >
      <div style={{ position: 'relative', height: yPositionsRef.current.getEstimatedHeight() }}>
        <div
          ref={el => {
            wrapperElmRef.current = el || undefined;
          }}
          className={itemsWrapperClassName}
          style={{ position: 'absolute', top: 0 }}
        >
          {items}
        </div>
      </div>
    </div>
  );
});

export default ListView;
