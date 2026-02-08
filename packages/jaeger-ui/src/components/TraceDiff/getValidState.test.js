// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import getValidState from './getValidState';

describe('getValidState', () => {
  const a = 'a string';
  const b = 'b string';
  const cohort = ['first string', 'second string', 'third string'];

  it('uses cohort kwarg when a and b are missing', () => {
    expect(getValidState({ cohort })).toEqual({
      a: cohort[0],
      b: cohort[1],
      cohort,
    });
  });

  it('uses a and b when provided', () => {
    expect(getValidState({ a, b, cohort })).toEqual({
      a,
      b,
      cohort: [a, b, ...cohort],
    });
  });

  it('preserves b in slot b and uses cohort[0] for a when only b is provided', () => {
    expect(getValidState({ b, cohort })).toEqual({
      a: cohort[0],
      b,
      cohort: [b, ...cohort],
    });
  });

  it('preserves a in slot a and uses cohort[0] for b when only a is provided', () => {
    expect(getValidState({ a, cohort })).toEqual({
      a,
      b: cohort[0],
      cohort: [a, ...cohort],
    });
  });
});
