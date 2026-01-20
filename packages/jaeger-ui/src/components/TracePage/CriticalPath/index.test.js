// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import TraceCriticalPath from './index';
import test1 from './testCases/test1';
import test2 from './testCases/test2';
import test3 from './testCases/test3';
import test4 from './testCases/test4';
import test6 from './testCases/test6';
import test7 from './testCases/test7';
import test5 from './testCases/test5';
import test8 from './testCases/test8';
import test9 from './testCases/test9';

describe.each([[test1], [test2], [test3], [test4], [test5], [test6], [test7], [test8], [test9]])(
  'Happy Path',
  testProps => {
    it('should find criticalPathSections correctly', () => {
      const criticalPath = TraceCriticalPath(testProps.trace);
      expect(criticalPath).toStrictEqual(testProps.criticalPathSections);
    });
  }
);
