// Copyright (c) 2023 The Jaeger Authors
// SPDX-License-Identifier: Apache-2.0

import getConfig from './get-config';

export function getTargetEmptyOrBlank() {
  return getConfig().forbidNewPage ? '' : '_blank';
}

export function getTargetBlankOrTop() {
  return getConfig().forbidNewPage ? '_top' : '_blank';
}
