// Copyright (c) 2018 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import _get from 'lodash/get';

import { EmbeddedState } from '../types/embedded';
import { getEmbeddedState } from '../utils/embedded-url';

export default function embeddedConfig(state: EmbeddedState | undefined) {
  if (state === undefined) {
    const search = _get(window, 'location.search');
    return search ? getEmbeddedState(search) : null;
  }
  return state;
}
