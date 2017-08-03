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

import sinon from 'sinon';

import * as sortUtils from './sort';

it('stringSortComparator() should properly sort a list of strings', () => {
  const arr = ['allen', 'Gustav', 'paul', 'Tim', 'abernathy', 'tucker', 'Steve', 'mike', 'John', 'Paul'];

  expect(arr.sort(sortUtils.stringSortComparator)).toEqual([
    'abernathy',
    'allen',
    'Gustav',
    'John',
    'mike',
    'paul',
    'Paul',
    'Steve',
    'Tim',
    'tucker',
  ]);
});

it('numberSortComparator() should properly sort a list of numbers', () => {
  const arr = [3, -1.1, 4, -1, 9, 4, 2, Infinity, 0, 0];

  expect(arr.sort(sortUtils.numberSortComparator)).toEqual([-1.1, -1, 0, 0, 2, 3, 4, 4, 9, Infinity]);
});

it('classNameForSortDir() should return the proper asc classes', () => {
  expect(sortUtils.classNameForSortDir(1)).toBe('sorted ascending');
});

it('classNameForSortDir() should return the proper desc classes', () => {
  expect(sortUtils.classNameForSortDir(-1)).toBe('sorted descending');
});

it('getNewSortForClick() should sort to the defaultDir if new column', () => {
  // no defaultDir provided
  expect(sortUtils.getNewSortForClick({ key: 'alpha', dir: 1 }, { name: 'beta' })).toEqual({
    key: 'beta',
    dir: 1,
  });

  // defaultDir provided
  expect(sortUtils.getNewSortForClick({ key: 'alpha', dir: 1 }, { name: 'beta', defaultDir: -1 })).toEqual({
    key: 'beta',
    dir: -1,
  });
});

it('getNewSortForClick() should toggle direction if same column', () => {
  expect(sortUtils.getNewSortForClick({ key: 'alpha', dir: 1 }, { name: 'alpha' })).toEqual({
    key: 'alpha',
    dir: -1,
  });

  expect(sortUtils.getNewSortForClick({ key: 'alpha', dir: -1 }, { name: 'alpha' })).toEqual({
    key: 'alpha',
    dir: 1,
  });
});

it('createSortClickHandler() should return a function', () => {
  const column = { name: 'alpha' };
  const currentSortKey = 'alpha';
  const currentSortDir = 1;
  const updateSort = sinon.spy();

  expect(typeof sortUtils.createSortClickHandler(column, currentSortKey, currentSortDir, updateSort)).toBe(
    'function'
  );
});

it('createSortClickHandler() should call updateSort with the new sort vals', () => {
  const column = { name: 'alpha' };
  const prevSort = { key: 'alpha', dir: 1 };
  const currentSortKey = prevSort.key;
  const currentSortDir = prevSort.dir;
  const updateSort = sinon.spy();

  const clickHandler = sortUtils.createSortClickHandler(column, currentSortKey, currentSortDir, updateSort);

  clickHandler();

  expect(
    updateSort.calledWith(
      sortUtils.getNewSortForClick(prevSort, column).key,
      sortUtils.getNewSortForClick(prevSort, column).dir
    )
  ).toBeTruthy();
});
