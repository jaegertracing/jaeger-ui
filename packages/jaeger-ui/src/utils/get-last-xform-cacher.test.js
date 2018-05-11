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

import getLastXformCacher from './get-last-xform-cacher';

const xformImpl = value => value + value;
let xformer;
let cacher;

beforeEach(() => {
  xformer = jest.fn(xformImpl);
  cacher = getLastXformCacher(xformer);
});

it('returns a function', () => {
  expect(cacher).toEqual(expect.any(Function));
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
