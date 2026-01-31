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

  it('uses b as a and cohort[0] for b when only b is provided', () => {
    expect(getValidState({ b, cohort })).toEqual({
      a: b,
      b: cohort[0],
      cohort: [b, ...cohort],
    });
  });
});
