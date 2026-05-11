// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { TDdgModelParams } from './types';

// Returns a key that uniquely identifies a fetched DDG dataset — all dependency paths radiating from a focal
// service+operation over a given time window. Used to key into the Redux ddg map and Zustand view modifier
// store, allowing multiple graphs with different focal points or time ranges to coexist simultaneously.
export default function getStateEntryKey({ service, operation = '*', start, end }: TDdgModelParams) {
  return `${service}\n${operation}\n${start}\n${end}`;
}
