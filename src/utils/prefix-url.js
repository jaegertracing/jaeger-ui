// Copyright (c) 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

import { homepage } from '../../package.json';

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

deriveAndSetPrefix(homepage);

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
