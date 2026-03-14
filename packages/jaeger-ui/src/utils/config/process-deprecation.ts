// Copyright (c) 2017 Uber Technologies, Inc.
// SPDX-License-Identifier: Apache-2.0

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
  const { formerKey, currentKey } = deprecation;
  if (_has(config, formerKey)) {
    let isTransfered = false;
    let isIgnored = false;
    if (!_has(config, currentKey)) {
      // the new key is not set so transfer the value at the old key
      const value = _get(config, formerKey);
      _set(config, currentKey, value);
      isTransfered = true;
    } else {
      isIgnored = true;
    }
    _unset(config, formerKey);

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

      console.warn(warnings.join('\n'));
    }
  }
}
