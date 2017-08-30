// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import React from 'react';
import Bluebird from 'bluebird';
import { mount, shallow } from 'enzyme';

import ListView from './index';
import { polyfill as polyfillAnimationFrame } from '../../../../utils/test/requestAnimationFrame';

describe('<ListView>', () => {
  // polyfill window.requestAnimationFrame (and cancel) into jsDom's window
  polyfillAnimationFrame(window);

  const DATA_LENGTH = 40;

  function getHeight(index) {
    return index * 2 + 2;
  }

  function Item(props) {
    // eslint-disable-next-line react/prop-types
    const { children, ...rest } = props;
    return (
      <div {...rest}>
        {children}
      </div>
    );
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
    initialDraw: 5,
    itemHeightGetter: getHeight,
    itemRenderer: renderItem,
    itemsWrapperClassName: 'SomeClassName',
    viewBuffer: 10,
    viewBufferMin: 5,
    windowScroller: false,
    // eslint-disable-next-line no-return-assign
    ref: c => (instance = c),
  };

  describe('shallow tests', () => {
    beforeEach(() => {
      wrapper = shallow(<ListView {...props} />);
    });

    it('renders without exploding', () => {
      expect(wrapper).toBeDefined();
    });

    it('matches a snapshot', () => {
      expect(wrapper).toMatchSnapshot();
    });

    it('initialDraw sets the number of items initially drawn', () => {
      expect(wrapper.find(Item).length).toBe(props.initialDraw);
    });

    it('sets the height of the items according to the height func', () => {
      const items = wrapper.find(Item);
      const expectedHeights = [];
      const heights = items.map((node, i) => {
        expectedHeights.push(getHeight(i));
        return node.prop('style').height;
      });
      expect(heights.length).toBe(props.initialDraw);
      expect(heights).toEqual(expectedHeights);
    });

    it('saves the currently drawn indexes to _startIndexDrawn and _endIndexDrawn', () => {
      const inst = wrapper.instance();
      expect(inst._startIndexDrawn).toBe(0);
      expect(inst._endIndexDrawn).toBe(props.initialDraw - 1);
    });
  });

  describe('mount tests', () => {
    beforeEach(() => {
      wrapper = mount(
        <div style={{ height: '150px', overflow: 'auto', position: 'relative' }}>
          <ListView {...props} />
        </div>
      );
    });

    it('renders without exploding', () => {
      expect(wrapper).toBeDefined();
    });

    describe('windowScroller', () => {
      let windowAddListenerSpy;

      beforeEach(() => {
        windowAddListenerSpy = jest.spyOn(window, 'addEventListener');
        const wsProps = { ...props, windowScroller: true };
        wrapper = mount(
          <div style={{ height: '150px', overflow: 'auto', position: 'relative' }}>
            <ListView {...wsProps} />
          </div>
        );
      });

      afterEach(() => {
        windowAddListenerSpy.mockRestore();
      });

      it('adds the onScroll listener to the root HTML element after it mounts', () => {
        expect(windowAddListenerSpy).toHaveBeenCalled();
        expect(windowAddListenerSpy).toHaveBeenLastCalledWith('scroll', instance._onScroll);
      });

      it('calls _positionList when the document is scrolled', async () => {
        const event = new Event('scroll');
        const fn = jest.spyOn(instance, '_positionList');
        expect(instance._isScrolledOrResized).toBe(false);
        window.dispatchEvent(event);
        expect(instance._isScrolledOrResized).toBe(true);
        await Bluebird.resolve().delay(0);
        expect(fn).toHaveBeenCalled();
      });

      it('uses the root HTML element to determine if the view has changed', () => {
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
