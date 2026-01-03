// Copyright (c) 2020 The Jaeger Authors.
// SPDX-License-Identifier: Apache-2.0

import { getParameterAndFormatter } from './link-formatting';

const PARAMETER_REG_EXP = /#\{([^{}]*)\}/g;

export function encodedStringSupplant(
  str: string,
  encodeFn: null | ((unencoded: string | number) => string),
  map: Record<string, string | number | undefined>
) {
  return str.replace(PARAMETER_REG_EXP, (_, name) => {
    const { parameterName, formatFunction } = getParameterAndFormatter<string | number | undefined>(name);
    const mapValue = map[parameterName];
    const formattedValue = formatFunction && mapValue ? formatFunction(mapValue) : mapValue;

    const value = formattedValue != null && encodeFn ? encodeFn(formattedValue) : mapValue;
    return value == null ? '' : `${value}`;
  });
}

export default function stringSupplant(str: string, map: Record<string, string | number | undefined>) {
  return encodedStringSupplant(str, null, map);
}

export function getParamNames(str: string) {
  const names = new Set<string>();
  str.replace(PARAMETER_REG_EXP, (match, name) => {
    names.add(name);
    return match;
  });
  return Array.from(names);
}
