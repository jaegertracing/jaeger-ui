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

import prefixUrl, { deriveAndSetPrefix } from './prefix-url';

describe('deriveAndSetPrefix()', () => {
  const targetPrefix = '/some/prefix';
  const homepages = [
    '/some/prefix',
    'some/prefix',
    '/some/prefix/',
    'http://my.example.com/some/prefix',
    'https://my.example.com/some/prefix/',
  ];

  homepages.forEach(s => {
    it(`parses "${s}" correctly`, () => {
      expect(deriveAndSetPrefix(s)).toBe(targetPrefix);
    });
  });
});

describe('prefixUrl()', () => {
  beforeAll(() => {
    deriveAndSetPrefix('/some/prefix');
  });

  const tests = [
    { source: undefined, target: '/some/prefix' },
    { source: null, target: '/some/prefix' },
    { source: '', target: '/some/prefix' },
    { source: '/', target: '/some/prefix/' },
    { source: '/a', target: '/some/prefix/a' },
    { source: '/a/', target: '/some/prefix/a/' },
    { source: '/a/b', target: '/some/prefix/a/b' },
  ];

  tests.forEach(({ source, target }) => {
    it(`prefixes "${source}" correctly`, () => {
      expect(prefixUrl(source)).toBe(target);
    });
  });
});
