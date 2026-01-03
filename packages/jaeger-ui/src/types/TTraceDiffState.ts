// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import TNil from './TNil';

type TTraceDiffState = {
  a?: string | TNil;
  b?: string | TNil;
  cohort: string[];
};

export default TTraceDiffState;
