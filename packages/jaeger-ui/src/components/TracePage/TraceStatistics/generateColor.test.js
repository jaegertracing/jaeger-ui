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
    expect(tableValue1[0].colorToPercent).toBe(
      'color-mix(in srgb, var(--span-color-6) 60%, var(--surface-primary))'
    );
    expect(tableValue1[1].isDetail).toBe(false);
    expect(tableValue1[1].count).toBe(3);
    expect(tableValue1[1].colorToPercent).toBe(
      'color-mix(in srgb, var(--span-color-6) 27.5%, var(--surface-primary))'
    );

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
    expect(tableValue1[0].colorToPercent).toBe(
      'color-mix(in srgb, var(--span-color-6) 60%, var(--surface-primary))'
    );
    expect(tableValue1[1].isDetail).toBe(false);
    expect(tableValue1[1].total).toBe(238);
    expect(tableValue1[1].colorToPercent).toBe(
      'color-mix(in srgb, var(--span-color-6) 29.6%, var(--surface-primary))'
    );

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
    expect(tableValue2[0].colorToPercent).toBe(
      'color-mix(in srgb, var(--span-color-6) 60%, var(--surface-primary))'
    );
    expect(tableValue2[1].isDetail).toBe(true);
    expect(tableValue2[1].count).toBe(1);
    expect(tableValue2[1].colorToPercent).toBe(
      'color-mix(in srgb, var(--span-color-6) 14.5%, var(--surface-primary))'
    );

    tableValue2 = generateColor(tableValue2, 'count', false);

    expect(tableValue2[0].isDetail).toBe(false);
    expect(tableValue2[0].count).toBe(8);
    expect(tableValue2[0].colorToPercent).toBe('transparent');
    expect(tableValue2[1].isDetail).toBe(true);
    expect(tableValue2[1].count).toBe(1);
    expect(tableValue2[1].colorToPercent).toBe('var(--surface-tertiary)');
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
    expect(tableValue2[0].colorToPercent).toBe(
      'color-mix(in srgb, var(--span-color-6) 60%, var(--surface-primary))'
    );
    expect(tableValue2[1].isDetail).toBe(true);
    expect(tableValue2[1].total).toBe(390);
    expect(tableValue2[1].colorToPercent).toBe(
      'color-mix(in srgb, var(--span-color-6) 43.39%, var(--surface-primary))'
    );

    tableValue2 = generateColor(tableValue2, 'total', false);

    expect(tableValue2[0].isDetail).toBe(false);
    expect(tableValue2[0].total).toBe(573);
    expect(tableValue2[0].colorToPercent).toBe('transparent');
    expect(tableValue2[1].isDetail).toBe(true);
    expect(tableValue2[1].total).toBe(390);
    expect(tableValue2[1].colorToPercent).toBe('var(--surface-tertiary)');
  });

  it('covers percent attribute with colorToPercent=true', () => {
    const input = [
      { isDetail: false, percent: 75 },
      { isDetail: false, percent: 25 },
    ];

    const output = generateColor(input, 'percent', true);

    expect(output[0].colorToPercent).toBe(
      'color-mix(in srgb, var(--span-color-6) 47%, var(--surface-primary))'
    );
    expect(output[1].colorToPercent).toBe(
      'color-mix(in srgb, var(--span-color-6) 21%, var(--surface-primary))'
    );
  });

  it('handles zero values without creating invalid colors', () => {
    const input = [
      { isDetail: false, count: 0 },
      { isDetail: false, count: 0 },
    ];

    const output = generateColor(input, 'count', true);

    expect(output[0].colorToPercent).toBe(
      'color-mix(in srgb, var(--span-color-6) 8%, var(--surface-primary))'
    );
    expect(output[1].colorToPercent).toBe(output[0].colorToPercent);
  });

  it('does not mutate the input rows', () => {
    const input = [{ isDetail: false, count: 1, colorToPercent: 'transparent' }];

    const output = generateColor(input, 'count', true);

    expect(output).not.toBe(input);
    expect(output[0]).not.toBe(input[0]);
    expect(input[0].colorToPercent).toBe('transparent');
  });
});
