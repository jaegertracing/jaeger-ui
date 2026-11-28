// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { generateDropdownValue, generateSecondDropdownValue } from './generateDropdownValue';
import { transformOtelTrace } from '../../../api/v3/parser';
import { validateTracesData } from '../../../api/v3/schemas';

import testTrace from '../testTrace.json';

const otelTrace = transformOtelTrace(validateTracesData(testTrace))!;

describe('generateDropdownValue', () => {
  it('check generateDropdownValue (legacy)', () => {
    const expectValues = ['Service Name', 'Operation Name', 'span.kind', 'error', 'db.type'];
    const values = generateDropdownValue(otelTrace, false);
    expect(values).toEqual(expectValues);
  });
  it('check generateDropdownValue (OTEL)', () => {
    const expectValues = ['Service Name', 'Span Name', 'span.kind', 'error', 'db.type'];
    const values = generateDropdownValue(otelTrace, true);
    expect(values).toEqual(expectValues);
  });

  it('check generateSecondDropdownValue no Attribute is selected (legacy)', () => {
    const expectValues = ['Operation Name', 'span.kind', 'error', 'db.type'];
    const values = generateSecondDropdownValue(otelTrace, 'Service Name', false);
    expect(values).toEqual(expectValues);
  });
  it('check generateSecondDropdownValue no Attribute is selected (OTEL)', () => {
    const expectValues = ['Span Name', 'span.kind', 'error', 'db.type'];
    const values = generateSecondDropdownValue(otelTrace, 'Service Name', true);
    expect(values).toEqual(expectValues);
  });

  it('check generateSecondDrop Attribute is selected', () => {
    const expectValues = ['Service Name', 'Operation Name', 'error'];
    const values = generateSecondDropdownValue(otelTrace, 'span.kind', false);
    expect(values).toEqual(expectValues);
  });

  it('check generateSecondDropdownValue when Operation Name is selected', () => {
    const expectValues = ['Service Name', 'span.kind', 'error', 'db.type'];
    const values = generateSecondDropdownValue(otelTrace, 'Operation Name', false);
    expect(values).toEqual(expectValues);
  });
});
