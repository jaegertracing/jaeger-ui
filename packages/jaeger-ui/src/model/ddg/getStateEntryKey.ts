// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { TDdgModelParams } from './types';

export default function getStateEntryKey({ service, operation = '*', start, end }: TDdgModelParams) {
  return `${service}\n${operation}\n${start}\n${end}`;
}
