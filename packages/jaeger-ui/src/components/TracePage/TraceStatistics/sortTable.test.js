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

import sortTable from './sortTable';

import transformTraceData from '../../../model/transform-trace-data';
import { getColumnValues, getColumnValuesSecondDropdown } from './tableValues';

const testTrace = require('./tableValuesTestTrace/testTrace.json');

const transformedTrace = transformTraceData(testTrace);

describe('sortTable', () => {
  it('check sortTable with sortAsc false', () => {
    let sortArray = getColumnValues('Service Name', transformedTrace);

    sortArray = sortTable(sortArray, 'count', false);

    expect(sortArray[0].count).toBe(8);
    expect(sortArray[1].count).toBe(3);
  });

  it('check sortTable with sortAsc true', () => {
    let sortArray = getColumnValues('Service Name', transformedTrace);

    sortArray = sortTable(sortArray, 'count', true);

    expect(sortArray[0].count).toBe(3);
    expect(sortArray[1].count).toBe(8);
  });

  it('check sortTable with detail and sortAsc false', () => {
    let sortArray = getColumnValuesSecondDropdown(
      getColumnValues('Service Name', transformedTrace),
      'Service Name',
      'Operation Name',
      transformedTrace
    );

    sortArray = sortTable(sortArray, 'count', false);

    expect(sortArray[0].isDetail).toBe(false);
    expect(sortArray[0].count).toBe(8);
    expect(sortArray[1].isDetail).toBe(true);
    expect(sortArray[1].count).toBe(2);
    expect(sortArray[2].isDetail).toBe(true);
    expect(sortArray[2].count).toBe(2);
  });

  it('check sortTable with detail and sortAsc true', () => {
    let sortArray = getColumnValuesSecondDropdown(
      getColumnValues('Service Name', transformedTrace),
      'Service Name',
      'Operation Name',
      transformedTrace
    );

    sortArray = sortTable(sortArray, 'count', true);

    expect(sortArray[0].isDetail).toBe(false);
    expect(sortArray[0].count).toBe(3);
    expect(sortArray[1].isDetail).toBe(true);
    expect(sortArray[1].count).toBe(1);
    expect(sortArray[2].isDetail).toBe(true);
    expect(sortArray[2].count).toBe(1);
  });
});
