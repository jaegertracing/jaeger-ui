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
import { render, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import ListView from './index';
import { polyfill as polyfillAnimationFrame } from '../../../../utils/test/requestAnimationFrame';

polyfillAnimationFrame(window);

describe('<ListView />', () => {
  const defaultProps = {
    dataLength: 40,
    getIndexFromKey: Number,
    getKeyFromIndex: String,
    initialDraw: 5,
    itemHeightGetter: i => i * 2 + 2,
    itemRenderer: (key, style, i, attrs = {}) => (
      <div key={key} style={style} {...attrs}>
        Row {i}
      </div>
    ),
    viewBuffer: 10,
    viewBufferMin: 5,
  };

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('renders initial number of items with correct keys and styles', () => {
    const { container } = render(<ListView {...defaultProps} />);
    const items = container.querySelectorAll('[data-item-key]');
    expect(items.length).toBeGreaterThanOrEqual(defaultProps.initialDraw);
    items.forEach((item, index) => {
      expect(item).toHaveStyle('position: absolute');
      expect(item).toHaveAttribute('data-item-key', String(index));
      expect(item).toHaveTextContent(`Row ${index}`);
    });
  });

  it('applies overflow and height styles only when windowScroller is false', () => {
    const { container } = render(<ListView {...defaultProps} windowScroller={false} />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveStyle('overflow-y: auto');
    expect(wrapper).toHaveStyle('height: 100%');
  });

  it('does not apply overflow style when windowScroller is true', () => {
    const { container } = render(<ListView {...defaultProps} windowScroller />);
    expect(container.firstChild).not.toHaveStyle('overflow-y: auto');
  });

  it('requests animation frame when user scrolls', () => {
    const rafSpy = jest.spyOn(window, 'requestAnimationFrame');
    const { container } = render(<ListView {...defaultProps} />);
    fireEvent.scroll(container.firstChild);
    expect(rafSpy).toHaveBeenCalledWith(expect.any(Function));
  });

  describe('windowScroller: scroll listener behavior', () => {
    beforeEach(() => {
      jest.spyOn(window, 'addEventListener');
      jest.spyOn(window, 'removeEventListener');
    });

    it('adds and removes scroll listener to window', () => {
      const { unmount } = render(<ListView {...defaultProps} windowScroller />);
      expect(window.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
      unmount();
      expect(window.removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
    });

    it('triggers scroll logic when window is scrolled', () => {
      const rafSpy = jest.spyOn(window, 'requestAnimationFrame');
      render(<ListView {...defaultProps} windowScroller />);
      window.dispatchEvent(new Event('scroll'));
      expect(rafSpy).toHaveBeenCalled();
    });
  });

  describe('edge cases in instance methods', () => {
    it('returns false from _isViewChanged when wrapper is null', () => {
      const ref = React.createRef();
      render(<ListView ref={ref} {...defaultProps} />);
      ref.current._wrapperElm = null;
      expect(ref.current._isViewChanged()).toBe(false);
    });

    it('skips _positionList execution when wrapper is null', () => {
      const ref = React.createRef();
      render(<ListView ref={ref} {...defaultProps} />);
      const forceUpdateSpy = jest.spyOn(ref.current, 'forceUpdate');
      ref.current._wrapperElm = null;
      ref.current._positionList();
      expect(forceUpdateSpy).not.toHaveBeenCalled();
    });

    it('logs warning for item missing data-item-key', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      render(
        <ListView
          {...defaultProps}
          itemRenderer={(key, style, i) => (
            <div key={key} style={style}>
              {i}
            </div>
          )}
        />
      );
      expect(warnSpy).toHaveBeenCalledWith('itemKey not found');
      warnSpy.mockRestore();
    });

    it('handles empty list gracefully', () => {
      const { container } = render(<ListView {...defaultProps} dataLength={0} />);
      const items = container.querySelectorAll('[data-item-key]');
      expect(items.length).toBe(0);
    });
  });

  describe('public instance method behavior', () => {
    it('getViewHeight returns current view height value', () => {
      const ref = React.createRef();
      render(<ListView ref={ref} {...defaultProps} />);
      ref.current._viewHeight = 99;
      expect(ref.current.getViewHeight()).toBe(99);
    });

    it('getBottomVisibleIndex returns correct index', () => {
      const ref = React.createRef();
      render(<ListView ref={ref} {...defaultProps} />);
      ref.current._scrollTop = 20;
      ref.current._viewHeight = 30;
      ref.current._yPositions.findFloorIndex = jest.fn(() => 5);
      expect(ref.current.getBottomVisibleIndex()).toBe(5);
    });

    it('getTopVisibleIndex returns correct index', () => {
      const ref = React.createRef();
      render(<ListView ref={ref} {...defaultProps} />);
      ref.current._scrollTop = 42;
      ref.current._yPositions.findFloorIndex = jest.fn(() => 4);
      expect(ref.current.getTopVisibleIndex()).toBe(4);
    });

    it('getRowPosition returns expected position object', () => {
      const ref = React.createRef();
      render(<ListView ref={ref} {...defaultProps} />);
      const mock = { height: 10, y: 55 };
      ref.current._yPositions.getRowPosition = jest.fn(() => mock);
      expect(ref.current.getRowPosition(2)).toEqual(mock);
    });
  });

  describe('_positionList logic', () => {
    it('calls forceUpdate when visible range is outside drawn range', () => {
      const ref = React.createRef();
      render(<ListView ref={ref} {...defaultProps} dataLength={10} viewBuffer={0} viewBufferMin={0} />);
      Object.assign(ref.current, {
        _wrapperElm: { clientHeight: 100, scrollTop: 0 },
        _startIndex: 2,
        _endIndex: 5,
        _startIndexDrawn: 5,
        _endIndexDrawn: 3,
      });
      const spy = jest.spyOn(ref.current, 'forceUpdate');
      ref.current._positionList();
      expect(spy).toHaveBeenCalled();
    });
  });
});
