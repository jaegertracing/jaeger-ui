// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { generateDropdownValue, generateSecondDropdownValue } from './generateDropdownValue';
import transformTraceData from '../../../model/transform-trace-data';

import testTrace from './tableValuesTestTrace/testTrace.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformedTrace = transformTraceData(testTrace as any)!;
const otelTrace = transformedTrace.asOtelTrace();

describe(' generateDropdownValue', () => {
  it('check generateDropdownValue', () => {
    const expectValues = ['Service Name', 'Operation Name', 'span.kind', 'error', 'db.type'];
    const values = generateDropdownValue(otelTrace);
    expect(values).toEqual(expectValues);
  });

  it('check generateSecondDropdownValue no Attribute is selected', () => {
    const expectValues = ['Operation Name', 'span.kind', 'error', 'db.type'];
    const values = generateSecondDropdownValue(otelTrace, 'Service Name');

    expect(values).toEqual(expectValues);
  });

  it('check generateSecondDrop Attribute is selected', () => {
    const expectValues = ['Service Name', 'Operation Name', 'error'];
    const values = generateSecondDropdownValue(otelTrace, 'span.kind');
    expect(values).toEqual(expectValues);
  });

  it('check generateSecondDropdownValue when Operation Name is selected', () => {
    const expectValues = ['Service Name', 'span.kind', 'error', 'db.type'];
    const values = generateSecondDropdownValue(otelTrace, 'Operation Name');

    expect(values).toEqual(expectValues);
  });
});
