// Copyright (c) 2023 The Jaeger Authors
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

import test1 from '../testCases/test1';
import test2 from '../testCases/test2';
import test3 from '../testCases/test3';
import test4 from '../testCases/test4';
import findRootSpanId from './findRootSpanId';

describe.each([
  [test1, 'span-C'],
  [test2, 'span-X'],
  [test3, '006c3cf93508f205'],
  [test4, 'span-A'],
])('findRootSpanId', (testProps, expectedRootSpanId) => {
  it('Should find RootSpanId correctly', () => {
    const rootSpanId = findRootSpanId(testProps.trace.spans);
    expect(rootSpanId).toBe(expectedRootSpanId);
  });
});
