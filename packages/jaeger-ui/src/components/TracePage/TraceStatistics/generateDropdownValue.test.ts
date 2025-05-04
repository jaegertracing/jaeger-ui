// Copyright (c) 2020 The Jaeger Authors.
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

import { generateDropdownValue, generateSecondDropdownValue } from './generateDropdownValue';
import transformTraceData from '../../../model/transform-trace-data';

import testTrace from './tableValuesTestTrace/testTrace.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformedTrace = transformTraceData(testTrace as any)!;

describe(' generateDropdownValue', () => {
  it('check generateDropdownValue', () => {
    const expectValues = ['Service Name', 'Operation Name', 'span.kind', 'error', 'db.type'];
    const values = generateDropdownValue(transformedTrace);
    expect(values).toEqual(expectValues);
  });

  it('check generateSecondDropdownValue no Tag is selected', () => {
    const expectValues = ['Operation Name', 'span.kind', 'error', 'db.type'];
    const values = generateSecondDropdownValue(transformedTrace, 'Service Name');

    expect(values).toEqual(expectValues);
  });

  it('check generateSecondDrop Tag is selected', () => {
    const expectValues = ['Service Name', 'Operation Name', 'error'];
    const values = generateSecondDropdownValue(transformedTrace, 'span.kind');
    expect(values).toEqual(expectValues);
  });
});
