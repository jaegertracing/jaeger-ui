// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from 'react';
import { render } from '@testing-library/react';
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
  let instance;

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
      const result = render(<ListView {...props} />);
      wrapper = result.container;

      const TestWrapper = React.forwardRef((innerProps, ref) => <ListView {...innerProps} ref={ref} />);
      const refResult = render(<TestWrapper {...props} />);
      instance =
        refResult.container.firstChild._owner?.stateNode ||
        refResult.container.querySelector('[data-testid]')?._reactInternalFiber?.return?.stateNode;
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
      let componentInstance;
      function TestComponent() {
        const ref = React.useRef();
        React.useEffect(() => {
          componentInstance = ref.current;
        });
        return <ListView {...props} ref={ref} />;
      }
      render(<TestComponent />);

      expect(componentInstance).toBeDefined();
      expect(componentInstance._startIndexDrawn).toBe(0);
      const expectedDrawnLength = componentInstance._endIndexDrawn - componentInstance._startIndexDrawn + 1;
      expect(expectedDrawnLength).toBeGreaterThanOrEqual(props.initialDraw);
    });
  });

  describe('mount tests', () => {
    describe('accessor functions', () => {
      const clientHeight = 2;
      const scrollTop = 3;

      let oldRender;
      let oldInitWrapper;
      const initWrapperMock = jest.fn(elm => {
        if (elm != null) {
          // jsDom requires `defineProperties` instead of just setting the props
          Object.defineProperties(elm, {
            clientHeight: {
              get: () => clientHeight,
            },
            scrollTop: {
              get: () => scrollTop,
            },
          });
        }
        oldInitWrapper.call(this, elm);
      });

      beforeAll(() => {
        oldRender = ListView.prototype.render;
        // `_initWrapper` is not on the prototype, so it needs to be mocked
        // on each instance, use `render()` as a hook to do that
        ListView.prototype.render = function altRender() {
          if (this._initWrapper !== initWrapperMock) {
            oldInitWrapper = this._initWrapper;
            this._initWrapper = initWrapperMock;
          }
          return oldRender.call(this);
        };
      });

      afterAll(() => {
        ListView.prototype.render = oldRender;
      });

      beforeEach(() => {
        initWrapperMock.mockClear();
        const result = render(<ListView {...props} />);
        wrapper = result.container;

        let componentInstance;
        function TestComponent() {
          const ref = React.useRef();
          React.useEffect(() => {
            componentInstance = ref.current;
          });
          return <ListView {...props} ref={ref} />;
        }
        render(<TestComponent />);
        instance = componentInstance;
      });

      it('getViewHeight() returns the viewHeight', () => {
        expect(instance).toBeDefined();
        expect(instance.getViewHeight()).toBe(clientHeight);
      });

      it('getBottomVisibleIndex() returns a number', () => {
        expect(instance).toBeDefined();
        const n = instance.getBottomVisibleIndex();
        expect(Number.isNaN(n)).toBe(false);
        expect(n).toEqual(expect.any(Number));
      });

      it('getTopVisibleIndex() returns a number', () => {
        expect(instance).toBeDefined();
        const n = instance.getTopVisibleIndex();
        expect(Number.isNaN(n)).toBe(false);
        expect(n).toEqual(expect.any(Number));
      });

      it('getRowPosition() returns a number', () => {
        expect(instance).toBeDefined();
        const { height, y } = instance.getRowPosition(2);
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

        let componentInstance;
        function TestComponent() {
          const ref = React.useRef();
          React.useEffect(() => {
            componentInstance = ref.current;
          });
          return <ListView {...wsProps} ref={ref} />;
        }
        const result = render(<TestComponent />);
        wrapper = result.container;
        instance = componentInstance;
      });

      afterEach(() => {
        windowAddListenerSpy.mockRestore();
        windowRmListenerSpy.mockRestore();
      });

      it('registers window scroll event listener on mount when windowScroller is true', () => {
        expect(instance).toBeDefined();
        const eventListeners = getListenersByType(windowAddListenerSpy.mock);
        expect(eventListeners.scroll).toEqual([instance._onScroll]);
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
        expect(instance).toBeDefined();
        const event = new Event('scroll');
        const fn = jest.spyOn(instance, '_positionList');
        expect(instance._isScrolledOrResized).toBe(false);
        window.dispatchEvent(event);
        expect(instance._isScrolledOrResized).toBe(true);
        window.requestAnimationFrame(() => {
          expect(fn).toHaveBeenCalled();
          done();
        });
      });

      it('uses the root HTML element to determine if the view has changed', () => {
        expect(instance).toBeDefined();
        const htmlElm = instance._htmlElm;
        expect(htmlElm).toBeTruthy();
        const spyFns = {
          clientHeight: jest.fn(() => instance._viewHeight + 1),
          scrollTop: jest.fn(() => instance._scrollTop + 1),
        };
        Object.defineProperties(htmlElm, {
          clientHeight: {
            get: spyFns.clientHeight,
          },
          scrollTop: {
            get: spyFns.scrollTop,
          },
        });
        const hasChanged = instance._isViewChanged();
        expect(spyFns.clientHeight).toHaveBeenCalled();
        expect(spyFns.scrollTop).toHaveBeenCalled();
        expect(hasChanged).toBe(true);
      });
    });
  });
});
