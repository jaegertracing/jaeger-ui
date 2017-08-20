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

import createMemoryHistory from 'history/createMemoryHistory';

import configureStore from './configure-store';

it('configureStore() should return the redux store', () => {
  const store = configureStore(createMemoryHistory());

  expect(typeof store.dispatch === 'function').toBeTruthy();
  expect(typeof store.getState === 'function').toBeTruthy();
  expect(typeof store.subscribe === 'function').toBeTruthy();
  expect(typeof store.replaceReducer === 'function').toBeTruthy();

  expect({}.hasOwnProperty.call(store.getState(), 'routing')).toBeTruthy();
  expect({}.hasOwnProperty.call(store.getState(), 'trace')).toBeTruthy();
  expect({}.hasOwnProperty.call(store.getState(), 'form')).toBeTruthy();
});
