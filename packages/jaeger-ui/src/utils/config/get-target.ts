// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import { getConfigValue } from './get-config';

export function getTargetEmptyOrBlank() {
  return getConfigValue('forbidNewPage') ? '' : '_blank';
}

export function getTargetBlankOrTop() {
  return getConfigValue('forbidNewPage') ? '_top' : '_blank';
}
