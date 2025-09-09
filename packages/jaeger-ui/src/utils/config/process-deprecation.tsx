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

import _get from 'lodash/get';
import _has from 'lodash/has';
import _set from 'lodash/set';
import _unset from 'lodash/unset';

interface IDeprecation {
  formerKey: string;
  currentKey: string;
}

/**
 * Processes a deprecated config property with respect to a configuration.
 * NOTE: This mutates `config`.
 *
 * If the deprecated config property is found to be set on `config`, it is
 * moved to the new config property unless a conflicting setting exists. If
 * `issueWarning` is `true`, warnings are issues when:
 *
 * - The deprecated config property is found to be set on `config`
 * - The value at the deprecated config property is moved to the new property
 * - The value at the deprecated config property is ignored in favor of the value at the new property
 */
export default function processDeprecation(config: object, deprecation: IDeprecation, issueWarning: boolean) {
  const { formerKey, currentKey } = deprecation || ({} as IDeprecation);

  // Basic validation of inputs
  const isObjectLike = typeof config === 'object' && config !== null;
  const isValidKey = (key: unknown) => typeof key === 'string' && key.trim().length > 0;
  const hasDangerousSegment = (path: string) => {
    const segments = path.split('.');
    return segments.some(seg => seg === '__proto__' || seg === 'prototype' || seg === 'constructor');
  };
  const canSafelySet = (target: unknown, path: string) => {
    if (typeof target !== 'object' || target === null || typeof path !== 'string') return false;
    const segments = path.split('.');
    let cursor: any = target;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (cursor == null) return false;
      const next = cursor[seg as keyof typeof cursor];
      if (next === undefined) {
        // creating new branch is safe
        cursor = {};
        continue;
      }
      if (typeof next !== 'object' || next === null) {
        return false;
      }
      cursor = next;
    }
    return true;
  };

  // If config or keys are malformed, do nothing but optionally warn
  if (
    !isObjectLike ||
    !isValidKey(formerKey) ||
    !isValidKey(currentKey) ||
    hasDangerousSegment(formerKey) ||
    hasDangerousSegment(currentKey)
  ) {
    if (issueWarning) {
      const reasons: string[] = [];
      if (!isObjectLike) reasons.push('config must be a non-null object');
      if (!isValidKey(formerKey)) reasons.push('formerKey must be a non-empty string');
      if (!isValidKey(currentKey)) reasons.push('currentKey must be a non-empty string');
      if (isValidKey(formerKey) && hasDangerousSegment(formerKey))
        reasons.push(`formerKey contains a dangerous path segment`);
      if (isValidKey(currentKey) && hasDangerousSegment(currentKey))
        reasons.push(`currentKey contains a dangerous path segment`);
      if (reasons.length) {
        console.warn(`Skipping deprecated config processing: ${reasons.join('; ')}`);
      }
    }
    return;
  }

  if (_has(config, formerKey)) {
    let isTransfered = false;
    let isIgnored = false;
    let didUnsetFormer = false;
    try {
      if (!_has(config, currentKey)) {
        // Only transfer if setting won't overwrite non-object intermediates
        if (canSafelySet(config, currentKey)) {
          const value = _get(config, formerKey);
          _set(config, currentKey, value);
          isTransfered = true;
          _unset(config, formerKey);
          didUnsetFormer = true;
        } else if (issueWarning) {
          console.warn(
            `Skipping move from "${formerKey}" to "${currentKey}": cannot safely create nested path without overwriting non-object values`
          );
        }
      } else {
        isIgnored = true;
        _unset(config, formerKey);
        didUnsetFormer = true;
      }
    } catch (err) {
      if (issueWarning) {
        console.warn(`Failed processing deprecation from "${formerKey}" to "${currentKey}": ${String(err)}`);
      }
    }

    if (issueWarning) {
      const warnings = [`"${formerKey}" is deprecated, instead use "${currentKey}"`];
      if (isTransfered) {
        warnings.push(`The value at "${formerKey}" has been moved to "${currentKey}"`);
      }
      if (isIgnored) {
        warnings.push(
          `The value at "${formerKey}" is being ignored in favor of the value at "${currentKey}"`
        );
      }
      if (!isTransfered && !isIgnored && !didUnsetFormer) {
        warnings.push(`The deprecated value at "${formerKey}" was left unchanged due to safety checks`);
      }

      if (warnings.length) {
        console.warn(warnings.join('\n'));
      }
    }
  }
}
