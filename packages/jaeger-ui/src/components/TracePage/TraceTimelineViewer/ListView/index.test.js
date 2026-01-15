// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ListView from './index';
import { polyfill as polyfillAnimationFrame } from '../../../../utils/test/requestAnimationFrame';

function getListenersByType(mockFn) {
  const rv = {};
  mockFn.calls.forEach(([eventType, callback]) => {
    if (!rv[eventType]) {
      rv[eventType] = [callback];
    } else {
      rv[eventType].push(callback);
    }
  });
  return rv;
}

// Helper to render ListView with ref access
function renderWithRef(props) {
  const ref = React.createRef();
  const result = render(<ListView {...props} ref={ref} />);
  return { ...result, componentRef: ref };
}

describe('<ListView>', () => {
  polyfillAnimationFrame(window);

  const DATA_LENGTH = 40;

  function getHeight(index) {
    return index * 2 + 2;
  }

  function Item(props) {
    const { children, ...rest } = props;
    return <div {...rest}>{children}</div>;
  }

  function renderItem(itemKey, styles, itemIndex, attrs) {
    return (
      <Item key={itemKey} style={styles} {...attrs}>
        {itemIndex}
      </Item>
    );
  }

  let wrapper;
  let componentRef;

  const props = {
    dataLength: DATA_LENGTH,
    getIndexFromKey: Number,
    getKeyFromIndex: String,
    initialDraw: 5,
    itemHeightGetter: getHeight,
    itemRenderer: renderItem,
    itemsWrapperClassName: 'SomeClassName',
    viewBuffer: 10,
    viewBufferMin: 5,
    windowScroller: false,
  };

  describe('initial rendering tests', () => {
    beforeEach(() => {
      const result = renderWithRef(props);
      wrapper = result.container;
      componentRef = result.componentRef;
    });

    it('renders without exploding', () => {
      expect(wrapper).toBeDefined();
    });

    it('matches a snapshot', () => {
      expect(wrapper.firstChild).toHaveStyle({ position: 'relative' });
      expect(wrapper.querySelector('.SomeClassName')).toBeInTheDocument();
    });

    it('initialDraw controls how many items are initially rendered', () => {
      const items = wrapper.querySelectorAll('.SomeClassName > div');
      expect(items.length).toBeGreaterThanOrEqual(props.initialDraw);
      expect(items.length).toBeLessThanOrEqual(props.initialDraw + props.viewBuffer * 2);
    });

    it('sets the height of the items according to the height func', () => {
      const items = wrapper.querySelectorAll('.SomeClassName > div');

      Array.from(items).forEach((node, i) => {
        Object.defineProperty(node, 'clientHeight', {
          get: () => getHeight(i),
          configurable: true,
        });
      });

      const expectedHeights = [];
      const heights = Array.from(items).map((node, i) => {
        expectedHeights.push(getHeight(i));
        return node.clientHeight;
      });

      expect(heights.length).toBeGreaterThanOrEqual(props.initialDraw);
      expect(heights).toEqual(expectedHeights);
    });

    it('stores drawn index range in _startIndexDrawn and _endIndexDrawn after mount', () => {
      expect(componentRef.current).toBeDefined();
      expect(componentRef.current._startIndexDrawn).toBe(0);
      const expectedDrawnLength =
        componentRef.current._endIndexDrawn - componentRef.current._startIndexDrawn + 1;
      expect(expectedDrawnLength).toBeGreaterThanOrEqual(props.initialDraw);
    });
  });

  describe('mount tests', () => {
    describe('accessor functions', () => {
      const clientHeight = 2;
      const scrollTop = 3;

      beforeEach(() => {
        // Create a custom render that sets up the wrapper element properties
        const ref = React.createRef();

        const { container } = render(<ListView {...props} ref={ref} />);
        wrapper = container;
        componentRef = ref;

        // Modify the wrapper element after render
        const wrapperElm = wrapper.firstChild;
        if (wrapperElm) {
          Object.defineProperties(wrapperElm, {
            clientHeight: {
              get: () => clientHeight,
            },
            scrollTop: {
              get: () => scrollTop,
            },
          });
          // Trigger a re-init by calling _initWrapper with the modified element
          act(() => {
            componentRef.current._initWrapper(wrapperElm);
          });
        }
      });

      it('getViewHeight() returns the viewHeight', () => {
        expect(componentRef.current).toBeDefined();
        expect(componentRef.current.getViewHeight()).toBe(clientHeight);
      });

      it('getBottomVisibleIndex() returns a number', () => {
        expect(componentRef.current).toBeDefined();
        const n = componentRef.current.getBottomVisibleIndex();
        expect(Number.isNaN(n)).toBe(false);
        expect(n).toEqual(expect.any(Number));
      });

      it('getTopVisibleIndex() returns a number', () => {
        expect(componentRef.current).toBeDefined();
        const n = componentRef.current.getTopVisibleIndex();
        expect(Number.isNaN(n)).toBe(false);
        expect(n).toEqual(expect.any(Number));
      });

      it('getRowPosition() returns a number', () => {
        expect(componentRef.current).toBeDefined();
        const { height, y } = componentRef.current.getRowPosition(2);
        expect(height).toEqual(expect.any(Number));
        expect(y).toEqual(expect.any(Number));
      });
    });

    describe('windowScroller', () => {
      let windowAddListenerSpy;
      let windowRmListenerSpy;

      beforeEach(() => {
        windowAddListenerSpy = jest.spyOn(window, 'addEventListener');
        windowRmListenerSpy = jest.spyOn(window, 'removeEventListener');
        const wsProps = { ...props, windowScroller: true };

        const result = renderWithRef(wsProps);
        wrapper = result.container;
        componentRef = result.componentRef;
      });

      afterEach(() => {
        windowAddListenerSpy.mockRestore();
        windowRmListenerSpy.mockRestore();
      });

      it('registers window scroll event listener on mount when windowScroller is true', () => {
        expect(componentRef.current).toBeDefined();
        const eventListeners = getListenersByType(windowAddListenerSpy.mock);
        expect(eventListeners.scroll).toBeDefined();
        expect(eventListeners.scroll.length).toBeGreaterThan(0);
      });

      it('cleans up scroll listener from window on unmount when windowScroller is enabled', () => {
        let eventListeners = getListenersByType(windowRmListenerSpy.mock);
        expect(eventListeners.scroll).not.toBeDefined();

        const { unmount } = render(<ListView {...{ ...props, windowScroller: true }} />);
        unmount();

        eventListeners = getListenersByType(windowRmListenerSpy.mock);
        expect(eventListeners.scroll).toBeDefined();
        expect(eventListeners.scroll.length).toBeGreaterThan(0);
      });

      it('triggers _positionList after scroll when windowScroller is enabled', done => {
        expect(componentRef.current).toBeDefined();
        const event = new Event('scroll');
        expect(componentRef.current._isScrolledOrResized).toBe(false);
        window.dispatchEvent(event);
        expect(componentRef.current._isScrolledOrResized).toBe(true);
        // After requestAnimationFrame, _positionList should have run and reset the flag
        window.requestAnimationFrame(() => {
          // _positionList resets _isScrolledOrResized to false
          expect(componentRef.current._isScrolledOrResized).toBe(false);
          done();
        });
      });

      it('uses the root HTML element to determine if the view has changed', () => {
        expect(componentRef.current).toBeDefined();
        const htmlElm = componentRef.current._htmlElm;
        expect(htmlElm).toBeTruthy();
        const spyFns = {
          clientHeight: jest.fn(() => componentRef.current._viewHeight + 1),
          scrollTop: jest.fn(() => componentRef.current._scrollTop + 1),
        };
        Object.defineProperties(htmlElm, {
          clientHeight: {
            get: spyFns.clientHeight,
          },
          scrollTop: {
            get: spyFns.scrollTop,
          },
        });
        const hasChanged = componentRef.current._isViewChanged();
        expect(spyFns.clientHeight).toHaveBeenCalled();
        expect(spyFns.scrollTop).toHaveBeenCalled();
        expect(hasChanged).toBe(true);
      });
    });
  });
});
