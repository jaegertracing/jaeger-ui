// Copyright (c) 2026 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import _toPath from 'lodash/toPath';

import stringSupplant, { encodedStringSupplant } from '../../utils/stringSupplant';

type TValues = Record<string, string | number | undefined>;

const PARAMETER_REG_EXP = /#\{[^{}]*\}/g;
// A private-use character never appears in a configured path, so it marks where each parameter was.
const MARKER = '';
const MARKER_REG_EXP = new RegExp(`${MARKER}(\\d+)${MARKER}`, 'g');

/** Fills a decoration URL template, encoding each substituted value as a URI component. */
export function supplantUrl(template: string, values: TValues): string {
  return encodedStringSupplant(template, encodeURIComponent, values);
}

/**
 * Fills a decoration response path template and returns it as lodash path segments. The template
 * is split before values are substituted, so a service or operation name containing `.` or `[`
 * stays one key instead of becoming nested keys.
 */
export function supplantPath(template: string, values: TValues): string[] {
  const parameters: string[] = [];
  const masked = template.replace(
    PARAMETER_REG_EXP,
    parameter => `${MARKER}${parameters.push(parameter) - 1}${MARKER}`
  );
  return _toPath(masked).map(segment =>
    segment.replace(MARKER_REG_EXP, (_, index) => stringSupplant(parameters[Number(index)], values))
  );
}
