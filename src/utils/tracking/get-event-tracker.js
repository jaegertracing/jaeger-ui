// @flow

// Copyright (c) 2017 Uber Technologies, Inc.
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

import { trackEvent } from './index';

type Stringable = string | ((...any) => string);
type Numberable = number | ((...any) => number);

export default function getEventTracker(
  categoryArg: Stringable,
  actionArg: Stringable = String,
  labelOrValueArg?: Stringable | Numberable,
  valueArg?: Numberable
) {
  const numArgs = arguments.length;
  if (numArgs < 2) {
    // eslint-disable-next-line no-console
    throw new Error('Invalid event tracker, not enough arguments');
  }
  return function track(...trackArgs: any[]) {
    const eventData = [
      typeof categoryArg === 'function' ? categoryArg(...trackArgs) : categoryArg,
      typeof actionArg === 'function' ? actionArg(...trackArgs) : actionArg,
    ];
    if (numArgs >= 3) {
      eventData.push(typeof labelOrValueArg === 'function' ? labelOrValueArg(...trackArgs) : labelOrValueArg);
    }
    if (numArgs >= 4) {
      eventData.push(typeof valueArg === 'function' ? valueArg(...trackArgs) : valueArg);
    }
    trackEvent(...eventData);
  };
}
