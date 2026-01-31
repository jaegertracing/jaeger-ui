// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { TNil } from '../../types';
import TTraceDiffState from '../../types/TTraceDiffState';

export default function getValidState(state: TTraceDiffState) {
  const { a: stA, b: stB, cohort: stCohort } = state;
  const cohortSet = new Set(
    ([] as (string | TNil)[])
      .concat(stA, stB, stCohort)
      .filter((str: string | TNil): str is string => Boolean(str))
  );
  const cohort: string[] = Array.from(cohortSet);
  const a = cohort[0];
  const b = cohort[1];
  return { a, b, cohort };
}
