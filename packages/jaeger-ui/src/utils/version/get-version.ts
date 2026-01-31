// Copyright (c) 2020 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

import defaultVersion from '../../constants/default-version';

let haveWarnedFactoryFn = false;

export default function getVersion() {
  const getJaegerVersion = window.getJaegerVersion;
  if (typeof getJaegerVersion !== 'function') {
    if (!haveWarnedFactoryFn) {
      console.warn('Embedded version information not available');
      haveWarnedFactoryFn = true;
    }
    return { ...defaultVersion };
  }
  const embedded = getJaegerVersion();
  if (!embedded) {
    return { ...defaultVersion };
  }

  return { ...embedded };
}
