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

import getLastXformCacher from './get-last-xform-cacher';

const xformImpl = value => value + value;
let xformer;
let cacher;

beforeEach(() => {
  xformer = jest.fn(xformImpl);
  cacher = getLastXformCacher(xformer);
});

it('returns a function', () => {
  expect(cacher).toEqual(jasmine.any(Function));
});

it('handles the first invocation where nothing is cached', () => {
  expect(() => cacher('a')).not.toThrow();
});

it('the returned function returns the same results as the transformer function', () => {
  expect(cacher('a')).toBe(xformImpl('a'));
  expect(cacher('a')).toBe(xformImpl('a'));
  expect(cacher(1)).toBe(xformImpl(1));
  expect(cacher('a')).not.toBe(cacher('b'));
});

it('the returned function returns a cached value for subsequent invocation with the same argument', () => {
  expect(xformer.mock.calls.length).toBe(0);
  const value = cacher('a');
  expect(xformer.mock.calls.length).toBe(1);
  expect(cacher('a')).toBe(value);
  expect(xformer.mock.calls.length).toBe(1);
});

it('the returned function ignores the cached value when invoked with different arguments', () => {
  expect(xformer.mock.calls.length).toBe(0);
  const firstValue = cacher('a');
  expect(xformer.mock.calls.length).toBe(1);
  expect(cacher('a')).toBe(firstValue);
  expect(xformer.mock.calls.length).toBe(1);
  const secondValue = cacher('b');
  expect(xformer.mock.calls.length).toBe(2);
  expect(cacher('b')).toBe(secondValue);
  expect(xformer.mock.calls.length).toBe(2);
});

it('the functionality works with multiple arguments', () => {
  const multiXformer = jest.fn((a, b) => [a + a, b + b]);
  const multiCacher = getLastXformCacher(multiXformer);

  expect(multiXformer.mock.calls.length).toBe(0);
  const firstValue = multiCacher('a', 'b');

  expect(multiXformer.mock.calls.length).toBe(1);
  expect(firstValue).toEqual(['aa', 'bb']);
  expect(multiCacher('a', 'b')).toBe(firstValue);
  expect(multiXformer.mock.calls.length).toBe(1);

  const secondValue = multiCacher('A', 'B');
  expect(multiXformer.mock.calls.length).toBe(2);
  expect(secondValue).toEqual(['AA', 'BB']);
  expect(multiCacher('A', 'B')).toBe(secondValue);
  expect(multiXformer.mock.calls.length).toBe(2);

  const thirdValue = multiCacher('A', 'B', 'extra-arg');
  expect(multiXformer.mock.calls.length).toBe(3);
  expect(thirdValue).not.toBe(secondValue);
  expect(thirdValue).toEqual(secondValue);
});
