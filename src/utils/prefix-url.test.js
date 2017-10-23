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
