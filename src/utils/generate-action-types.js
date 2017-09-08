// @flow

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

/**
 * Util to generate an object of key:value pairs where key is
 * `commonPrefix/topLevelTypes[i]` and value is `topLevelTypes[i]` for all `i`
 * in `topLevelTypes`.
 *
 * @example generateActionTypes('a', ['b']) -> {'a/b': 'b'}
 *
 * @param commonPrefix A string that is prepended to each value in
 *                     `topLevelTypes` to create a property name
 * @param topLevelTypes An array of strings to generate property names from and
 *                      to assign as the corresponding values.
 * @returns {{[string]: string}}
 */
export default function generateActionTypes(commonPrefix: string, topLevelTypes: string[]) {
  const rv = {};
  topLevelTypes.forEach(type => {
    const fullType = `${commonPrefix}/${type}`;
    rv[type] = fullType;
  });
  return rv;
}
