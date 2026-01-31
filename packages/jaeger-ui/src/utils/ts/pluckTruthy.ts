// Copyright (c) 2019 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any */
// Because TypeScript doesn't believe in Array#filter(Boolean)
export default function pluckTruthy<T>(values: (T | any)[]): T[] {
  const rv: T[] = [];
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (value) {
      rv.push(value);
    }
  }
  return rv;
}
