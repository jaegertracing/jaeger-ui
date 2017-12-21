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

import { getQuerySvcConfig } from './config';

// strip the domain, first slash and trailing slash (if present)
const rx = new RegExp('^(?:https?://[^/]+)?/?(.*?)/?$', 'i');
let prefix = '';

/**
 * Generate the URL prefix from `value` and use it for all subsequent calls to
 * `prefixUrl()`. All of the following `value` parameters result in the prefix
 * `"/some/prefix"` (although, the first is the preferred form).
 *
 * - `"/some/prefix"`
 * - `"some/prefix"`
 * - `"/some/prefix/"`
 * - `"http://my.example.com/some/prefix"`
 * - `"https://my.example.com/some/prefix/"`
 *
 * Note: This function has a side effect of setting the default URL prefix
 * applied via the file's default explort.
 *
 * @param {?string} value The value to derive the URL prefix from.
 * @return {string} The resultant prefix.
 */
export function deriveAndSetPrefix(value) {
  prefix = value ? value.replace(rx, '/$1') : '';
  return prefix;
}

deriveAndSetPrefix(getQuerySvcConfig().pathPrefix);

/**
 * Add the URL prefix, derived from `homepage` in `package.json`, to the URL
 * argument. The domain is stripped from `homepage` before being added.
 *
 * @param {string} value The URL to have the prefix added to.
 * @return {string} The resultant URL.
 */
export default function prefixUrl(value) {
  const s = value == null ? '' : String(value);
  return prefix + s;
}
