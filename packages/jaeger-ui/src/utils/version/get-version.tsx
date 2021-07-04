// Copyright (c) 2020 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import defaultVersion from '../../constants/default-version';

let haveWarnedFactoryFn = false;

export default function getVersion() {
  const getJaegerVersion = window.getJaegerVersion;
  if (typeof getJaegerVersion !== 'function') {
    if (!haveWarnedFactoryFn) {
      // eslint-disable-next-line no-console
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
