// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';

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
 * Public interface for ListView ref, exposing methods and internal state for testing.
 */
export type TListViewRef = {
  // Internal state accessors (for testing)
  readonly _yPositions: Positions;
  readonly _knownHeights: Map<string, number>;
  readonly _startIndexDrawn: number;
  readonly _endIndexDrawn: number;
  readonly _startIndex: number;
  readonly _endIndex: number;
  readonly _viewHeight: number;
  readonly _scrollTop: number;
  readonly _isScrolledOrResized: boolean;
  readonly _htmlTopOffset: number;
  readonly _windowScrollListenerAdded: boolean;
  readonly _htmlElm: HTMLElement;
  readonly _wrapperElm: HTMLElement | TNil;
  readonly _itemHolderElm: HTMLElement | TNil;
  // Public methods
  getViewHeight: () => number;
  getBottomVisibleIndex: () => number;
  getTopVisibleIndex: () => number;
  getRowPosition: (index: number) => { height: number; y: number };
  // Internal methods (exposed for testing)
  _onScroll: () => void;
  _isViewChanged: () => boolean;
  _calcViewIndexes: () => void;
  _positionList: () => void;
  _initWrapper: (elm: HTMLElement | TNil) => void;
  _initItemHolder: (elm: HTMLElement | TNil) => void;
  _scanItemHeights: () => void;
  _getHeight: (i: number) => number;
  forceUpdate: () => void;
};

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
 */
const ListView = React.forwardRef<TListViewRef, TListViewProps>(function ListView(props, ref) {
  const {
    dataLength,
    getIndexFromKey,
    getKeyFromIndex,
    initialDraw = DEFAULT_INITIAL_DRAW,
    itemHeightGetter,
    itemRenderer,
    itemsWrapperClassName = '',
    viewBuffer,
    viewBufferMin,
    windowScroller = false,
  } = props;

  // State for forcing re-renders (replaces forceUpdate)
  const [, setForceUpdate] = React.useState(0);
  const forceRerender = React.useCallback(() => setForceUpdate(c => c + 1), []);

  // Instance variables as refs
  const _yPositions = React.useRef<Positions>(new Positions(200));
  const _knownHeights = React.useRef<Map<string, number>>(new Map());

  const _startIndexDrawn = React.useRef<number>(2 ** 20);
  const _endIndexDrawn = React.useRef<number>(-(2 ** 20));
  const _startIndex = React.useRef<number>(0);
  const _endIndex = React.useRef<number>(0);
  const _viewHeight = React.useRef<number>(-1);
  const _scrollTop = React.useRef<number>(-1);
  const _isScrolledOrResized = React.useRef<boolean>(false);

  const _htmlTopOffset = React.useRef<number>(-1);
  const _windowScrollListenerAdded = React.useRef<boolean>(false);
  const _htmlElm = React.useRef<HTMLElement>(document.documentElement as any);
  const _wrapperElm = React.useRef<HTMLElement | TNil>(undefined);
  const _itemHolderElm = React.useRef<HTMLElement | TNil>(undefined);

  // Track mount state to skip first effect run (mimics componentDidUpdate behavior)
  const _hasMounted = React.useRef<boolean>(false);

  // Ref to hold latest _onScroll callback (stable reference for event listener)
  const _onScrollRef = React.useRef<() => void>(() => {});

  // Get height for an item
  const _getHeight = React.useCallback(
    (i: number) => {
      const key = getKeyFromIndex(i);
      const known = _knownHeights.current.get(key);
      // known !== known iff known is NaN
      if (known != null && known === known) {
        return known;
      }
      return itemHeightGetter(i, key);
    },
    [getKeyFromIndex, itemHeightGetter]
  );

  // Check if view has changed
  const _isViewChanged = React.useCallback(() => {
    if (!_wrapperElm.current) {
      return false;
    }
    const useRoot = windowScroller;
    const clientHeight = useRoot ? _htmlElm.current.clientHeight : _wrapperElm.current.clientHeight;
    const scrollTop = useRoot ? _htmlElm.current.scrollTop : _wrapperElm.current.scrollTop;
    return clientHeight !== _viewHeight.current || scrollTop !== _scrollTop.current;
  }, [windowScroller]);

  // Calculate view indexes
  const _calcViewIndexes = React.useCallback(() => {
    const useRoot = windowScroller;
    if (!useRoot) {
      if (!_wrapperElm.current) {
        _viewHeight.current = -1;
        _startIndex.current = 0;
        _endIndex.current = 0;
        return;
      }
      _viewHeight.current = _wrapperElm.current.clientHeight;
      _scrollTop.current = _wrapperElm.current.scrollTop;
    } else {
      _viewHeight.current = window.innerHeight - _htmlTopOffset.current;
      _scrollTop.current = window.scrollY;
    }
    const yStart = _scrollTop.current;
    const yEnd = _scrollTop.current + _viewHeight.current;
    _startIndex.current = _yPositions.current.findFloorIndex(yStart, _getHeight);
    _endIndex.current = _yPositions.current.findFloorIndex(yEnd, _getHeight);
  }, [windowScroller, _getHeight]);

  // Position list callback
  const _positionList = React.useCallback(() => {
    _isScrolledOrResized.current = false;
    if (!_wrapperElm.current) {
      return;
    }
    _calcViewIndexes();
    // indexes drawn should be padded by at least viewBufferMin
    const maxStart = viewBufferMin > _startIndex.current ? 0 : _startIndex.current - viewBufferMin;
    const minEnd =
      viewBufferMin < dataLength - _endIndex.current ? _endIndex.current + viewBufferMin : dataLength - 1;
    if (maxStart < _startIndexDrawn.current || minEnd > _endIndexDrawn.current) {
      forceRerender();
    }
  }, [_calcViewIndexes, viewBufferMin, dataLength, forceRerender]);

  // Scroll handler
  const _onScroll = React.useCallback(() => {
    if (!_isScrolledOrResized.current) {
      _isScrolledOrResized.current = true;
      window.requestAnimationFrame(_positionList);
    }
  }, [_positionList]);

  // Keep _onScrollRef updated with latest _onScroll callback
  // This allows us to use a stable function for the event listener
  React.useEffect(() => {
    _onScrollRef.current = _onScroll;
  }, [_onScroll]);

  // Stable scroll handler for event listener (doesn't change between renders)
  const _handleScroll = React.useCallback(() => {
    _onScrollRef.current();
  }, []);

  // Scan item heights
  const _scanItemHeights = React.useCallback(() => {
    if (!_itemHolderElm.current) {
      return;
    }
    // note the keys for the first and last altered heights, the `yPositions`
    // needs to be updated
    let lowDirtyKey: string | null = null;
    let highDirtyKey: string | null = null;
    let isDirty = false;
    // iterating childNodes is faster than children
    // https://jsperf.com/large-htmlcollection-vs-large-nodelist
    const nodes = _itemHolderElm.current.childNodes;
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
      const known = _knownHeights.current.get(itemKey);
      if (observed !== known) {
        _knownHeights.current.set(itemKey, observed);
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
      _yPositions.current.calcHeights(imax, _getHeight, imin);
      forceRerender();
    }
  }, [getIndexFromKey, _getHeight, forceRerender]);

  // Init wrapper callback
  const _initWrapper = React.useCallback(
    (elm: HTMLElement | TNil) => {
      _wrapperElm.current = elm;
      if (!windowScroller && elm) {
        _viewHeight.current = elm.clientHeight;
      }
    },
    [windowScroller]
  );

  // Init item holder callback
  const _initItemHolder = React.useCallback(
    (elm: HTMLElement | TNil) => {
      _itemHolderElm.current = elm;
      _scanItemHeights();
    },
    [_scanItemHeights]
  );

  // Public accessor methods
  const getViewHeight = React.useCallback(() => _viewHeight.current, []);

  const getBottomVisibleIndex = React.useCallback((): number => {
    const bottomY = _scrollTop.current + _viewHeight.current;
    return _yPositions.current.findFloorIndex(bottomY, _getHeight);
  }, [_getHeight]);

  const getTopVisibleIndex = React.useCallback(
    (): number => _yPositions.current.findFloorIndex(_scrollTop.current, _getHeight),
    [_getHeight]
  );

  const getRowPosition = React.useCallback(
    (index: number): { height: number; y: number } => _yPositions.current.getRowPosition(index, _getHeight),
    [_getHeight]
  );

  // componentDidMount equivalent
  // Use _handleScroll (stable reference) instead of _onScroll to avoid
  // re-registering the scroll listener when dependencies change.
  // This matches the original class component behavior where the listener
  // was only registered once in componentDidMount.
  React.useEffect(() => {
    if (windowScroller) {
      if (_wrapperElm.current) {
        const { top } = _wrapperElm.current.getBoundingClientRect();
        _htmlTopOffset.current = top + _htmlElm.current.scrollTop;
      }
      window.addEventListener('scroll', _handleScroll);
      _windowScrollListenerAdded.current = true;
    }

    // componentWillUnmount equivalent
    return () => {
      if (_windowScrollListenerAdded.current) {
        window.removeEventListener('scroll', _handleScroll);
      }
    };
  }, [windowScroller, _handleScroll]);

  // componentDidUpdate equivalent - scan heights after render
  // This effect runs on every render to detect height changes.
  // We skip the first execution to match componentDidUpdate behavior
  // (which doesn't run on mount). On mount, _scanItemHeights is already
  // called via _initItemHolder, so running it again would be redundant.
  React.useEffect(() => {
    if (_hasMounted.current && _itemHolderElm.current) {
      _scanItemHeights();
    }
    _hasMounted.current = true;
  });

  // Expose methods and properties via ref for tests
  React.useImperativeHandle(
    ref,
    () => ({
      // Direct property access
      get _yPositions() {
        return _yPositions.current;
      },
      get _knownHeights() {
        return _knownHeights.current;
      },
      get _startIndexDrawn() {
        return _startIndexDrawn.current;
      },
      get _endIndexDrawn() {
        return _endIndexDrawn.current;
      },
      get _startIndex() {
        return _startIndex.current;
      },
      get _endIndex() {
        return _endIndex.current;
      },
      get _viewHeight() {
        return _viewHeight.current;
      },
      get _scrollTop() {
        return _scrollTop.current;
      },
      get _isScrolledOrResized() {
        return _isScrolledOrResized.current;
      },
      get _htmlTopOffset() {
        return _htmlTopOffset.current;
      },
      get _windowScrollListenerAdded() {
        return _windowScrollListenerAdded.current;
      },
      get _htmlElm() {
        return _htmlElm.current;
      },
      get _wrapperElm() {
        return _wrapperElm.current;
      },
      get _itemHolderElm() {
        return _itemHolderElm.current;
      },
      // Methods
      getViewHeight,
      getBottomVisibleIndex,
      getTopVisibleIndex,
      getRowPosition,
      _onScroll,
      _isViewChanged,
      _calcViewIndexes,
      _positionList,
      _initWrapper,
      _initItemHolder,
      _scanItemHeights,
      _getHeight,
      forceUpdate: forceRerender,
    }),
    [
      getViewHeight,
      getBottomVisibleIndex,
      getTopVisibleIndex,
      getRowPosition,
      _onScroll,
      _isViewChanged,
      _calcViewIndexes,
      _positionList,
      _initWrapper,
      _initItemHolder,
      _scanItemHeights,
      _getHeight,
      forceRerender,
    ]
  );

  // Render
  const heightGetter = _getHeight;
  const items = [];
  let start: number;
  let end: number;

  _yPositions.current.profileData(dataLength);

  if (!_wrapperElm.current) {
    start = 0;
    end = (initialDraw < dataLength ? initialDraw : dataLength) - 1;
  } else {
    if (_isViewChanged()) {
      _calcViewIndexes();
    }
    const maxStart = viewBufferMin > _startIndex.current ? 0 : _startIndex.current - viewBufferMin;
    const minEnd =
      viewBufferMin < dataLength - _endIndex.current ? _endIndex.current + viewBufferMin : dataLength - 1;
    if (maxStart < _startIndexDrawn.current || minEnd > _endIndexDrawn.current) {
      start = viewBuffer > _startIndex.current ? 0 : _startIndex.current - viewBuffer;
      end = _endIndex.current + viewBuffer;
      if (end >= dataLength) {
        end = dataLength - 1;
      }
    } else {
      start = _startIndexDrawn.current;
      end = _endIndexDrawn.current > dataLength - 1 ? dataLength - 1 : _endIndexDrawn.current;
    }
  }

  _yPositions.current.calcHeights(end, heightGetter, start || -1);
  _startIndexDrawn.current = start;
  _endIndexDrawn.current = end;

  items.length = end - start + 1;
  for (let i = start; i <= end; i++) {
    const { y: top, height } = _yPositions.current.getRowPosition(i, heightGetter);
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
  if (!windowScroller) {
    wrapperProps.onScroll = _onScroll;
    wrapperProps.style.height = '100%';
    wrapperProps.style.overflowY = 'auto';
  }
  const scrollerStyle = {
    position: 'relative' as const,
    height: _yPositions.current.getEstimatedHeight(),
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
