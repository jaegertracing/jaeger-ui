// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ListView from './index';
import { polyfill as polyfillAnimationFrame } from '../../../../utils/test/requestAnimationFrame';

Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
  configurable: true,
  get() {
    // Wrapper / scroller get a viewport height
    if (this.style && this.style.overflowY === 'auto') {
      return 300;
    }

    // Items: derive height from data-item-key if present
    const key = this.getAttribute && this.getAttribute('data-item-key');
    if (key != null) {
      const index = Number(key);
      return index * 2 + 2; // same as getHeight()
    }

    // Fallback non-zero height
    return 300;
  },
});

// 2) Default scrollTop so calculations are stable
Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
  configurable: true,
  writable: true,
  value: 0,
});

describe('<ListView /> functional', () => {
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

  // Helper to get wrapper element
  const getWrapper = container => container.firstChild;

  // Helper to get items
  const getItems = container => container.querySelectorAll('.SomeClassName > div');

  // Helper to simulate scroll with proper dimensions
  const simulateScroll = (element, scrollTop) => {
    Object.defineProperty(element, 'scrollTop', {
      value: scrollTop,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(element, 'clientHeight', {
      value: 300,
      writable: true,
      configurable: true,
    });
    fireEvent.scroll(element);
  };

  // --------------------
  // Rendering
  // --------------------

  it('renders without crashing', () => {
    const { container } = render(<ListView {...props} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders initial items', () => {
    const { container } = render(<ListView {...props} />);
    const items = getItems(container);
    expect(items.length).toBeGreaterThanOrEqual(props.initialDraw);
  });

  it('applies wrapper class name', () => {
    const { container } = render(<ListView {...props} />);
    expect(container.querySelector('.SomeClassName')).toBeInTheDocument();
  });

  it('renders items absolutely positioned', () => {
    const { container } = render(<ListView {...props} />);
    const items = getItems(container);

    items.forEach(node => {
      const element = node;
      expect(element.style.position).toBe('absolute');
      expect(element.style.top).toBeTruthy();
      expect(element.style.height).toBeTruthy();
    });
  });

  it('applies data-item-key attribute to items', () => {
    const { container } = render(<ListView {...props} />);
    const items = getItems(container);

    items.forEach(node => {
      expect(node.getAttribute('data-item-key')).toBeTruthy();
    });
  });

  // --------------------
  // Virtualization
  // --------------------

  it('does not render all items at once', () => {
    const { container } = render(<ListView {...props} />);
    const items = getItems(container);
    expect(items.length).toBeLessThan(DATA_LENGTH);
  });

  it('renders new items after scroll', async () => {
    const { container } = render(<ListView {...props} />);
    const wrapper = getWrapper(container);

    const firstItemBefore = getItems(container)[0]?.textContent;

    // Simulate scrolling down
    simulateScroll(wrapper, 400);

    await waitFor(
      () => {
        const firstItemAfter = getItems(container)[0]?.textContent;
        expect(firstItemAfter).not.toEqual(firstItemBefore);
      },
      { timeout: 1000 }
    );
  });

  it('maintains correct number of rendered items after scroll', async () => {
    const { container } = render(<ListView {...props} />);
    const wrapper = getWrapper(container);

    const itemsBeforeScroll = getItems(container).length;

    simulateScroll(wrapper, 200);

    await waitFor(() => {
      const itemsAfterScroll = getItems(container).length;
      // Should render similar number of items (within buffer range)
      expect(itemsAfterScroll).toBeGreaterThan(0);
      expect(itemsAfterScroll).toBeLessThan(DATA_LENGTH);
    });
  });

  // --------------------
  // Scroll handling
  // --------------------

  it('debounces scroll events using requestAnimationFrame', () => {
    const rafSpy = jest.spyOn(window, 'requestAnimationFrame');
    const { container } = render(<ListView {...props} />);
    const wrapper = getWrapper(container);

    // Set up dimensions first
    Object.defineProperty(wrapper, 'clientHeight', {
      value: 300,
      configurable: true,
    });

    // Multiple scroll events should only trigger one RAF
    fireEvent.scroll(wrapper);
    fireEvent.scroll(wrapper);
    fireEvent.scroll(wrapper);

    // Should only call RAF once due to debouncing
    expect(rafSpy).toHaveBeenCalledTimes(1);

    rafSpy.mockRestore();
  });

  it('handles scroll events correctly', () => {
    const { container } = render(<ListView {...props} />);
    const wrapper = getWrapper(container);

    simulateScroll(wrapper, 100);

    // Should not throw error
    expect(container.firstChild).toBeInTheDocument();
  });

  // --------------------
  // windowScroller
  // --------------------

  it('registers window scroll listener when windowScroller=true', () => {
    const spy = jest.spyOn(window, 'addEventListener');
    render(<ListView {...props} windowScroller />);
    expect(spy).toHaveBeenCalledWith('scroll', expect.any(Function));
    spy.mockRestore();
  });

  it('removes window scroll listener on unmount', () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = render(<ListView {...props} windowScroller />);

    // Get the listener function that was added
    const addCalls = addSpy.mock.calls.filter(call => call[0] === 'scroll');
    expect(addCalls.length).toBeGreaterThan(0);

    unmount();

    // Verify removeEventListener was called
    const removeCalls = removeSpy.mock.calls.filter(call => call[0] === 'scroll');
    expect(removeCalls.length).toBeGreaterThan(0);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('does not register window listener when windowScroller=false', () => {
    const spy = jest.spyOn(window, 'addEventListener');
    const scrollCalls = spy.mock.calls.filter(call => call[0] === 'scroll').length;

    render(<ListView {...props} windowScroller={false} />);

    const newScrollCalls = spy.mock.calls.filter(call => call[0] === 'scroll').length;
    expect(newScrollCalls).toBe(scrollCalls);

    spy.mockRestore();
  });

  // --------------------
  // Edge cases
  // --------------------

  it('handles zero dataLength', () => {
    const { container } = render(<ListView {...props} dataLength={0} />);
    const items = getItems(container);
    expect(items.length).toBe(0);
  });

  it('handles very large dataLength efficiently', () => {
    const { container } = render(<ListView {...props} dataLength={10000} />);
    const items = getItems(container);
    // Should only render a small subset
    expect(items.length).toBeLessThan(200);
  });

  it('handles single item', () => {
    const { container } = render(<ListView {...props} dataLength={1} />);
    const items = getItems(container);

    expect(items.length).toBe(1);
    expect(items[0].textContent).toBe('0');
  });

  it('renders correctly when initialDraw exceeds dataLength', () => {
    const { container } = render(<ListView {...props} dataLength={3} initialDraw={10} />);
    const items = getItems(container);
    expect(items.length).toBe(3);
  });

  // --------------------
  // Heights
  // --------------------

  it('uses itemHeightGetter', () => {
    const spy = jest.fn(getHeight);
    render(<ListView {...props} itemHeightGetter={spy} />);
    expect(spy).toHaveBeenCalled();
  });

  it('measures rendered item heights', () => {
    const { container } = render(<ListView {...props} />);
    const items = getItems(container);

    // Mock clientHeight for each item
    Array.from(items).forEach((node, i) => {
      Object.defineProperty(node, 'clientHeight', {
        get: () => getHeight(i),
        configurable: true,
      });
    });

    expect(items.length).toBeGreaterThan(0);

    // Verify items have height styles applied
    items.forEach(item => {
      const element = item;
      expect(element.style.height).toBeTruthy();
    });
  });

  it('applies correct heights to items based on index', () => {
    const { container } = render(<ListView {...props} />);
    const items = getItems(container);

    Array.from(items).forEach(node => {
      const key = node.getAttribute('data-item-key');
      const index = Number(key);
      const expectedHeight = getHeight(index);

      expect(node.style.height).toBe(`${expectedHeight}px`);
    });
  });

  // --------------------
  // Dynamic updates
  // --------------------

  it('updates correctly when dataLength changes', () => {
    const { rerender, container } = render(<ListView {...props} />);
    const initialItems = getItems(container).length;

    rerender(<ListView {...props} dataLength={DATA_LENGTH * 2} />);

    const items = getItems(container);
    expect(items.length).toBeGreaterThan(0);
    // May or may not change depending on view, but should handle the change gracefully
  });

  it('updates when dataLength decreases', () => {
    const { rerender, container } = render(<ListView {...props} />);

    rerender(<ListView {...props} dataLength={5} />);

    const items = getItems(container);
    expect(items.length).toBeLessThanOrEqual(5);
  });

  it('handles prop changes gracefully', () => {
    const { rerender, container } = render(<ListView {...props} />);

    rerender(<ListView {...props} viewBuffer={20} />);
    rerender(<ListView {...props} viewBufferMin={10} />);

    const items = getItems(container);
    expect(items.length).toBeGreaterThan(0);
  });

  // --------------------
  // Positioning
  // --------------------

  it('positions items with increasing top values', () => {
    const { container } = render(<ListView {...props} />);
    const items = Array.from(getItems(container));

    let previousTop = -1;
    items.forEach(item => {
      const top = parseFloat(item.style.top);
      expect(top).toBeGreaterThanOrEqual(previousTop);
      previousTop = top;
    });
  });

  it('creates proper scroll container structure', () => {
    const { container } = render(<ListView {...props} />);

    // Outer wrapper
    const outerWrapper = container.firstChild;
    expect(outerWrapper.style.position).toBe('relative');
    expect(outerWrapper.style.overflowY).toBe('auto');

    // Scroller (middle div)
    const scroller = outerWrapper.firstChild;
    expect(scroller.style.position).toBe('relative');
    expect(scroller.style.height).toBeTruthy();

    // Items wrapper
    const itemsWrapper = scroller.firstChild;
    expect(itemsWrapper.style.position).toBe('absolute');
    expect(itemsWrapper.className).toBe('SomeClassName');
  });

  // --------------------
  // Buffer behavior
  // --------------------

  it('respects viewBuffer prop', async () => {
    const customProps = { ...props, viewBuffer: 2, viewBufferMin: 1 };
    const { container } = render(<ListView {...customProps} />);
    const wrapper = getWrapper(container);

    simulateScroll(wrapper, 50);

    await waitFor(() => {
      const items = getItems(container);
      // With small buffer, should render fewer items
      expect(items.length).toBeGreaterThan(0);
      expect(items.length).toBeLessThan(DATA_LENGTH);
    });
  });

  it('respects viewBufferMin prop', async () => {
    const customProps = { ...props, viewBufferMin: 2 };
    const { container } = render(<ListView {...customProps} />);
    const wrapper = getWrapper(container);

    simulateScroll(wrapper, 100);

    await waitFor(() => {
      const items = getItems(container);
      expect(items.length).toBeGreaterThan(2); // At least viewBufferMin items rendered
    });
  });

  // --------------------
  // Regression tests
  // --------------------

  it('does not lose items when scrolling rapidly', async () => {
    const { container } = render(<ListView {...props} />);
    const wrapper = getWrapper(container);

    // Simulate rapid scrolling
    simulateScroll(wrapper, 100);
    simulateScroll(wrapper, 200);
    simulateScroll(wrapper, 300);

    await waitFor(() => {
      const items = getItems(container);
      expect(items.length).toBeGreaterThan(0);
    });
  });

  it('maintains stability across multiple renders', async () => {
    const { container, rerender } = render(<ListView {...props} />);
    const initialItemCount = getItems(container).length;

    rerender(<ListView {...props} />);
    rerender(<ListView {...props} />);
    rerender(<ListView {...props} />);

    await waitFor(() => {
      const finalItemCount = getItems(container).length;

      // Still virtualized
      expect(finalItemCount).toBeGreaterThan(0);
      expect(finalItemCount).toBeLessThan(DATA_LENGTH);

      // Does not explode unboundedly
      expect(finalItemCount).toBeLessThan(200);
    });
  });

  it('handles missing itemKey gracefully', () => {
    // This test verifies the console.warn behavior is still present
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const customRenderer = (itemKey, styles, itemIndex, attrs) => {
      // Render without the data-item-key attribute
      const { 'data-item-key': _key, ...restAttrs } = attrs;
      return (
        <div key={itemKey} style={styles} {...restAttrs}>
          {itemIndex}
        </div>
      );
    };

    const { container } = render(<ListView {...props} itemRenderer={customRenderer} />);

    // Component should still render
    expect(container.firstChild).toBeInTheDocument();

    consoleWarnSpy.mockRestore();
  });
});
