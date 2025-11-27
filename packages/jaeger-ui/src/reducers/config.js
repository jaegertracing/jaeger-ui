// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import getConfig from '../utils/config/get-config';

export default function reduceConfig(state) {
  if (state === undefined) {
    return getConfig();
  }
  return state;
}
