// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import { EmbeddedState } from '../types/embedded';
import { getEmbeddedState } from '../utils/embedded-url';

export default function embeddedConfig(state: EmbeddedState | undefined) {
  if (state === undefined) {
    const search = globalThis.window?.location?.search;
    return search ? getEmbeddedState(search) : null;
  }
  return state;
}
