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

import JaegerUIApp, { TracePage, SearchTracePage } from './index';

/* eslint-disable global-require, import/newline-after-import */
it('JaegerUIApp should be exported as default', () => {
  expect(JaegerUIApp).toBe(require('../src/components/App').default);
});

it('TracePage should be exported as as a named export', () => {
  expect(TracePage).toBe(require('../src/components/TracePage').default);
});

it('SearchTracePage should be exported as a named export', () => {
  expect(SearchTracePage).toBe(require('../src/components/SearchTracePage').SearchTracePage);
});
/* eslint-enable global-require, import/newline-after-import */
