// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

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
export default function generateActionTypes(
  commonPrefix: string,
  topLevelTypes: string[]
): Record<string, string> {
  const rv: Record<string, string> = {};
  topLevelTypes.forEach(type => {
    const fullType = `${commonPrefix}/${type}`;
    rv[type] = fullType;
  });
  return rv;
}
