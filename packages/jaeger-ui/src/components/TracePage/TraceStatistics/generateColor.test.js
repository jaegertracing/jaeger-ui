// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import generateColor from './generateColor';
import transformTraceData from '../../../model/transform-trace-data';
import { getColumnValuesSecondDropdown, getColumnValues } from './tableValues';

import testTrace from './tableValuesTestTrace/testTrace.json';

const transformedTrace = transformTraceData(testTrace).asOtelTrace();

describe('generateColor', () => {
  it('check generateColor to count, one NameSelector is selected', () => {
    let tableValue1 = getColumnValues('Service Name', transformedTrace);
    tableValue1 = generateColor(tableValue1, 'count', true);

    expect(tableValue1[0].isDetail).toBe(false);
    expect(tableValue1[0].count).toBe(8);
    expect(tableValue1[0].colorToPercent).toBe('rgba(255, 77, 79, 0.8)');
    expect(tableValue1[1].isDetail).toBe(false);
    expect(tableValue1[1].count).toBe(3);
    expect(tableValue1[1].colorToPercent).toBe('rgba(255, 77, 79, 0.3)');

    tableValue1 = generateColor(tableValue1, 'count', false);
    expect(tableValue1[0].isDetail).toBe(false);
    expect(tableValue1[0].count).toBe(8);
    expect(tableValue1[0].colorToPercent).toBe('transparent');
    expect(tableValue1[1].isDetail).toBe(false);
    expect(tableValue1[1].count).toBe(3);
    expect(tableValue1[1].colorToPercent).toBe('transparent');
  });

  it('check generateColor with total, one NameSelector is selected', () => {
    let tableValue1 = getColumnValues('Service Name', transformedTrace);
    tableValue1 = generateColor(tableValue1, 'total', true);

    expect(tableValue1[0].isDetail).toBe(false);
    expect(tableValue1[0].total).toBe(573);
    expect(tableValue1[0].colorToPercent).toBe('rgba(255, 77, 79, 0.8)');
    expect(tableValue1[1].isDetail).toBe(false);
    expect(tableValue1[1].total).toBe(238);
    // factor = 238 / 573 = 0.4153577...
    // alpha = factor * 0.8 = 0.332286... -> 0.332
    expect(tableValue1[1].colorToPercent).toBe('rgba(255, 77, 79, 0.332)');

    tableValue1 = generateColor(tableValue1, 'count', false);
    expect(tableValue1[0].isDetail).toBe(false);
    expect(tableValue1[0].total).toBe(573);
    expect(tableValue1[0].colorToPercent).toBe('transparent');
    expect(tableValue1[1].isDetail).toBe(false);
    expect(tableValue1[1].total).toBe(238);
    expect(tableValue1[1].colorToPercent).toBe('transparent');
  });

  it('check generarteColor with count, two NameSelectors are selected', () => {
    const tableValue1 = getColumnValues('Service Name', transformedTrace);
    let tableValue2 = getColumnValuesSecondDropdown(
      tableValue1,
      'Service Name',
      'Operation Name',
      transformedTrace
    );

    tableValue2 = generateColor(tableValue2, 'count', true);

    expect(tableValue2[0].isDetail).toBe(false);
    expect(tableValue2[0].count).toBe(8);
    expect(tableValue2[0].colorToPercent).toBe('rgba(255, 77, 79, 0.8)');
    expect(tableValue2[1].isDetail).toBe(true);
    expect(tableValue2[1].count).toBe(1);
    // factor = 1 / 8 = 0.125
    // alpha = 0.125 * 0.8 = 0.1
    expect(tableValue2[1].colorToPercent).toBe('rgba(255, 77, 79, 0.1)');

    tableValue2 = generateColor(tableValue2, 'count', false);

    expect(tableValue2[0].isDetail).toBe(false);
    expect(tableValue2[0].count).toBe(8);
    expect(tableValue2[0].colorToPercent).toBe('transparent');
    expect(tableValue2[1].isDetail).toBe(true);
    expect(tableValue2[1].count).toBe(1);
    expect(tableValue2[1].colorToPercent).toBe('transparent');
  });

  it('check generateColor with total, two NameSelectors are selcted', () => {
    const tableValue1 = getColumnValues('Service Name', transformedTrace);
    let tableValue2 = getColumnValuesSecondDropdown(
      tableValue1,
      'Service Name',
      'Operation Name',
      transformedTrace
    );

    tableValue2 = generateColor(tableValue2, 'total', true);

    expect(tableValue2[0].isDetail).toBe(false);
    expect(tableValue2[0].total).toBe(573);
    expect(tableValue2[0].colorToPercent).toBe('rgba(255, 77, 79, 0.8)');
    expect(tableValue2[1].isDetail).toBe(true);
    expect(tableValue2[1].total).toBe(390);
    // factor = 390 / 573 = 0.680628...
    // alpha = factor * 0.8 = 0.544502... -> 0.545
    expect(tableValue2[1].colorToPercent).toBe('rgba(255, 77, 79, 0.545)');

    tableValue2 = generateColor(tableValue2, 'total', false);

    expect(tableValue2[0].isDetail).toBe(false);
    expect(tableValue2[0].total).toBe(573);
    expect(tableValue2[0].colorToPercent).toBe('transparent');
    expect(tableValue2[1].isDetail).toBe(true);
    expect(tableValue2[1].total).toBe(390);
    expect(tableValue2[1].colorToPercent).toBe('transparent');
  });

  it('covers percent attribute with colorToPercent=true', () => {
    const input = [
      { isDetail: false, percent: 75 },
      { isDetail: false, percent: 25 },
    ];

    const output = generateColor(input, 'percent', true);

    // factor = 75/100 = 0.75; alpha = 0.75 * 0.8 = 0.6
    expect(output[0].colorToPercent).toBe('rgba(255, 77, 79, 0.6)');
    // factor = 25/100 = 0.25; alpha = 0.25 * 0.8 = 0.2
    expect(output[1].colorToPercent).toBe('rgba(255, 77, 79, 0.2)');
  });
});
