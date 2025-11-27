// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import regexpEscape from './regexp-escape';

describe('regexp-escape', () => {
  const chars = '-/\\^$*+?.()|[]{}'.split('');
  chars.forEach(c => {
    it(`escapes "${c}" correctly`, () => {
      const result = regexpEscape(c);
      expect(result.length).toBe(2);
      expect(result[0]).toBe('\\');
      expect(result[1]).toBe(c);
    });
  });
});
