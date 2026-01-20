// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

export const OPEN = 'open';
export const CLOSE = 'close';

export function getToggleValue(value: boolean) {
  return value ? CLOSE : OPEN;
}
